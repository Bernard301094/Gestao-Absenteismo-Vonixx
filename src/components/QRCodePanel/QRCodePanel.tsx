import React, { useMemo } from 'react';
import { useAccessCode } from '../../hooks/useAccessCode';

interface QRCodePanelProps {
  baseUrl: string;
}

export const QRCodePanel: React.FC<QRCodePanelProps> = ({ baseUrl }) => {
  const { currentCode, timeLeft } = useAccessCode(true);

  const separator = baseUrl.includes('?') ? '&' : '?';
  const urlWithCode = `${baseUrl}${separator}code=${currentCode}`;

  // QR via Google Charts API — sem dependência npm
  const qrSrc = useMemo(() => {
    if (!currentCode) return '';
    const encoded = encodeURIComponent(urlWithCode);
    return `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chld=M|2&chl=${encoded}`;
  }, [urlWithCode, currentCode]);

  const circumference = 2 * Math.PI * 20;
  const offset = circumference - ((timeLeft / 30) * circumference);
  const isExpiring = timeLeft <= 8;

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.875rem',
      width: '260px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%' }}>
        <span style={{ fontSize: '1.4rem' }}>📱</span>
        <div>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
            Acesso por QR Code
          </p>
          <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b' }}>
            Escaneie para marcar presença
          </p>
        </div>
      </div>

      {/* QR Image */}
      <div style={{
        position: 'relative',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '2px solid #e2e8f0',
        lineHeight: 0,
        width: 200,
        height: 200,
        background: '#f7f6f2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {qrSrc ? (
          <img
            src={qrSrc}
            alt="QR Code de presença"
            width={200}
            height={200}
            style={{ display: 'block' }}
          />
        ) : (
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Carregando...</span>
        )}
        {timeLeft <= 5 && timeLeft > 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(247,246,242,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.85rem', color: '#e97316',
          }}>
            Atualizando...
          </div>
        )}
      </div>

      {/* Código numérico */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span style={{
          fontSize: '0.6rem', textTransform: 'uppercase',
          letterSpacing: '0.1em', color: '#94a3b8', fontWeight: 600,
        }}>
          Código atual
        </span>
        <span style={{
          fontSize: '2rem', fontWeight: 800,
          letterSpacing: '0.3em', color: '#01696f',
          fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        }}>
          {currentCode || '------'}
        </span>
      </div>

      {/* Timer circular */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="44" height="44" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r="20" fill="none" stroke="#e2e8f0" strokeWidth="3" />
          <circle
            cx="26" cy="26" r="20" fill="none"
            stroke={isExpiring ? '#e97316' : '#01696f'}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 26 26)"
            style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s' }}
          />
          <text
            x="26" y="31" textAnchor="middle"
            fontSize="13" fontWeight="700"
            fill={isExpiring ? '#e97316' : '#0f3638'}
          >
            {timeLeft}s
          </text>
        </svg>
        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
          próximo código em {timeLeft}s
        </span>
      </div>
    </div>
  );
};

export default QRCodePanel;
