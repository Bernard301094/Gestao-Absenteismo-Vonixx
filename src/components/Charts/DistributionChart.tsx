import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Employee } from '../../types';

interface DistributionChartProps {
  employees: Employee[];
  getStatusForDay: (empId: string, day: number) => string;
  selectedDay: number;
}

interface PieEntry {
  name: string;
  value: number;
}

const PALETTE = {
  presentes: {
    solid:  '#10b981', light: '#d1fae5', border: '#6ee7b7',
    text:   '#065f46', label: '#059669', glow: 'rgba(16,185,129,0.25)',
  },
  faltas: {
    solid:  '#f43f5e', light: '#ffe4e6', border: '#fda4af',
    text:   '#881337', label: '#e11d48', glow: 'rgba(244,63,94,0.25)',
  },
  outros: {
    solid:  '#8b5cf6', light: '#ede9fe', border: '#c4b5fd',
    text:   '#4c1d95', label: '#7c3aed', glow: 'rgba(139,92,246,0.25)',
  },
};

const PIE_COLORS = [PALETTE.presentes.solid, PALETTE.faltas.solid, PALETTE.outros.solid];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const entry: PieEntry = payload[0].payload;
  const colorKey = entry.name === 'Presentes' ? 'presentes' : entry.name === 'Faltas' ? 'faltas' : 'outros';
  const pal = PALETTE[colorKey];
  return (
    <div style={{ background: pal.light, border: `1.5px solid ${pal.border}`, borderRadius: '10px', padding: '8px 14px', boxShadow: `0 4px 16px ${pal.glow}` }}>
      <span style={{ fontWeight: 700, color: pal.text, fontSize: '13px' }}>{entry.name}: {entry.value}</span>
    </div>
  );
};

export default function DistributionChart({ employees, getStatusForDay, selectedDay }: DistributionChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const presentes = employees.filter(e => getStatusForDay(e.id, selectedDay) === 'P').length;
  const faltas    = employees.filter(e => getStatusForDay(e.id, selectedDay) === 'F').length;
  const outros    = employees.filter(e => { const s = getStatusForDay(e.id, selectedDay); return s === 'Fe' || s === 'A'; }).length;

  const pieData: PieEntry[] = [
    { name: 'Presentes', value: presentes },
    { name: 'Faltas',    value: faltas },
    { name: 'Outros',    value: outros },
  ].filter(d => d.value > 0);

  const total = presentes + faltas + outros;
  const pctPresenca = total > 0 ? Math.round((presentes / total) * 100) : 0;
  const centerColor = pctPresenca >= 80 ? '#059669' : pctPresenca >= 60 ? '#d97706' : '#e11d48';

  if (!mounted || pieData.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '8px' }}>
        <span style={{ fontSize: '32px' }}>📊</span>
        <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center' }}>Sem dados para o dia selecionado</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', letterSpacing: '-0.01em' }}>Distribuição do Dia</span>
          <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{total} colaboradores registrados</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1px solid #bfdbfe', borderRadius: '100px' }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', letterSpacing: '0.02em' }}>Dia {selectedDay}</span>
        </div>
      </div>

      {/* Chart - Responsive adjustments made here */}
      <div style={{ height: '300px', width: '100%', maxWidth: '420px', position: 'relative', minWidth: 0 }}>
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* Uso de porcentajes en lugar de pixeles para los radios */}
              <Pie 
                data={pieData} 
                cx="50%" 
                cy="50%" 
                innerRadius="65%" 
                outerRadius="90%" 
                paddingAngle={5} 
                cornerRadius={8} 
                dataKey="value" 
                stroke="none" 
                animationBegin={0} 
                animationDuration={700} 
                animationEasing="ease-out"
              >
                {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} cursor={false} />
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Centro: presentes/total + % */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none', gap: '2px' }}>
          <span style={{ fontSize: '22px', fontWeight: 800, color: centerColor, lineHeight: 1 }}>
            {presentes}<span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>/{total}</span>
          </span>
          <span style={{ fontSize: '18px', fontWeight: 800, color: centerColor, lineHeight: 1 }}>
            {pctPresenca}%
          </span>
          <span style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '1px' }}>
            Presença
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {pieData.map((entry, index) => {
          const colorKey = entry.name === 'Presentes' ? 'presentes' : entry.name === 'Faltas' ? 'faltas' : 'outros';
          const pal = PALETTE[colorKey];
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div key={entry.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 14px', background: pal.light, border: `1.5px solid ${pal.border}`, borderRadius: '12px', minWidth: '80px', flex: '1 1 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: PIE_COLORS[index], display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: pal.text }}>{entry.name}</span>
              </div>
              <span style={{ fontSize: '20px', fontWeight: 800, color: pal.label, lineHeight: 1 }}>{entry.value}</span>
              <span style={{ fontSize: '10px', color: pal.text, opacity: 0.7 }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}