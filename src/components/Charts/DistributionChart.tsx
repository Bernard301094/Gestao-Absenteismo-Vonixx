import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Employee, AttendanceRecord } from '../../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DistributionChartProps {
  employees: Employee[];
  attendance: AttendanceRecord;
  selectedDay: number;
}

interface PieEntry {
  name: string;
  value: number;
}

// ─── Palette ─────────────────────────────────────────────────────────────────

const PALETTE = {
  presentes: {
    solid:   '#10b981',
    light:   '#d1fae5',
    border:  '#6ee7b7',
    text:    '#065f46',
    label:   '#059669',
    glow:    'rgba(16, 185, 129, 0.25)',
  },
  faltas: {
    solid:   '#f43f5e',
    light:   '#ffe4e6',
    border:  '#fda4af',
    text:    '#881337',
    label:   '#e11d48',
    glow:    'rgba(244, 63, 94, 0.25)',
  },
  outros: {
    solid:   '#8b5cf6',
    light:   '#ede9fe',
    border:  '#c4b5fd',
    text:    '#4c1d95',
    label:   '#7c3aed',
    glow:    'rgba(139, 92, 246, 0.25)',
  },
} as const;

const PIE_COLORS = [PALETTE.presentes.solid, PALETTE.faltas.solid, PALETTE.outros.solid];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  const name  = entry.name  as string;
  const value = entry.value as number;

  const colorMap: Record<string, typeof PALETTE[keyof typeof PALETTE]> = {
    Presentes: PALETTE.presentes,
    Faltas:    PALETTE.faltas,
    Outros:    PALETTE.outros,
  };
  const theme = colorMap[name] ?? PALETTE.presentes;

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${theme.border}`,
        borderRadius: '14px',
        padding: '10px 16px',
        boxShadow: `0 20px 40px -8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04), 0 4px 16px ${theme.glow}`,
        minWidth: '130px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: theme.solid,
            flexShrink: 0,
            boxShadow: `0 0 6px ${theme.glow}`,
          }}
        />
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {name}
        </span>
      </div>
      <span style={{ fontSize: '22px', fontWeight: 900, color: theme.text, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '4px', fontWeight: 500 }}>
        {value === 1 ? 'pessoa' : 'pessoas'}
      </span>
    </div>
  );
};

// ─── Metric Card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number;
  theme: typeof PALETTE[keyof typeof PALETTE];
  total: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, theme, total }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div
      style={{
        background: `linear-gradient(145deg, ${theme.light}, rgba(255,255,255,0.9))`,
        border: `1px solid ${theme.border}`,
        borderRadius: '16px',
        padding: '14px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        boxShadow: `0 2px 8px ${theme.glow}, 0 1px 2px rgba(0,0,0,0.04)`,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 20px ${theme.glow}, 0 1px 4px rgba(0,0,0,0.06)`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 2px 8px ${theme.glow}, 0 1px 2px rgba(0,0,0,0.04)`;
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: theme.solid,
          opacity: 0.08,
        }}
      />
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: theme.solid,
          boxShadow: `0 0 8px ${theme.glow}`,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: '9px',
          fontWeight: 800,
          color: theme.label,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '22px',
          fontWeight: 900,
          color: theme.text,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: '10px',
          fontWeight: 600,
          color: theme.label,
          opacity: 0.75,
        }}
      >
        {pct}%
      </span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DistributionChart({
  employees,
  attendance,
  selectedDay,
}: DistributionChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const faltasCount   = employees.filter(emp => attendance[emp.id]?.[selectedDay] === 'F').length;
  const outrosCount   = employees.filter(emp => ['Fe', 'A'].includes(attendance[emp.id]?.[selectedDay] ?? 'P')).length;
  const presentesCount = employees.length - faltasCount;
  const presencaRate  = employees.length > 0 ? Math.round((presentesCount / employees.length) * 100) : 0;

  const pieData: PieEntry[] = [
    { name: 'Presentes', value: presentesCount },
    { name: 'Faltas',    value: faltasCount },
    { name: 'Outros',    value: outrosCount },
  ].filter(d => d.value > 0);

  const rateColor =
    presencaRate >= 90 ? PALETTE.presentes.text :
    presencaRate >= 70 ? '#92400e' :
    PALETTE.faltas.text;

  const rateGlow =
    presencaRate >= 90 ? PALETTE.presentes.glow :
    presencaRate >= 70 ? 'rgba(245,158,11,0.2)' :
    PALETTE.faltas.glow;

  return (
    <div
      style={{
        background: 'linear-gradient(160deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05), 0 20px 40px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
            Distribuição de Presença
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
            {employees.length} colaboradores no total
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            border: '1px solid #bfdbfe',
            borderRadius: '100px',
          }}
        >
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', letterSpacing: '0.02em' }}>
            Dia {selectedDay}
          </span>
        </div>
      </div>

      <div style={{ height: '300px', width: '100%', maxWidth: '420px', position: 'relative' }}>
        {mounted && (
          <ResponsiveContainer width="99%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={82}
                outerRadius={118}
                paddingAngle={5}
                cornerRadius={8}
                dataKey="value"
                stroke="none"
                animationBegin={0}
                animationDuration={700}
                animationEasing="ease-out"
              >
                {pieData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={<CustomTooltip />}
                cursor={false}
              />
            </PieChart>
          </ResponsiveContainer>
        )}

        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${rateGlow} 0%, transparent 70%)`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
          <span
            style={{
              fontSize: '34px',
              fontWeight: 900,
              color: rateColor,
              lineHeight: 1,
              letterSpacing: '-0.03em',
              position: 'relative',
            }}
          >
            {presencaRate}%
          </span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 800,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              position: 'relative',
            }}
          >
            Presença
          </span>
        </div>
      </div>

      <div
        style={{
          width: '100%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(226,232,240,0.8), transparent)',
          margin: '4px 0 16px',
        }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%' }}>
        <MetricCard label="Presentes" value={presentesCount} theme={PALETTE.presentes} total={employees.length} />
        <MetricCard label="Faltas"    value={faltasCount}    theme={PALETTE.faltas}    total={employees.length} />
        <MetricCard label="Outros"    value={outrosCount}    theme={PALETTE.outros}    total={employees.length} />
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {(
          [
            { label: 'Presentes', theme: PALETTE.presentes },
            { label: 'Faltas',    theme: PALETTE.faltas },
            { label: 'Outros',    theme: PALETTE.outros },
          ] as const
        ).map(({ label, theme }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                background: theme.solid,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
