import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useAccessCode } from '../../hooks/useAccessCode';

interface QRCodePanelProps {
  baseUrl: string;
}

export const QRCodePanel: React.FC<QRCodePanelProps> = ({ baseUrl }) => {
  const { currentCode, timeLeft } = useAccessCode(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const urlWithCode = `${baseUrl}?code=${currentCode}`;

  useEffect(() => {
    if (!canvasRef.current || !currentCode) return;
    QRCode.toCanvas(canvasRef.current, urlWithCode, {
      width: 220,
      margin: 2,
      color: { dark: '#0f3638', light: '#f7f6f2' },
    });
  }, [currentCode, urlWithCode]);

  const circumference = 2 * Math.PI * 20;
  const pct = (timeLeft / 30) * 100;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="qr-access-panel">
      <div className="qr-access-header">
        <span className="qr-access-icon">📱</span>
        <div>
          <h3 className="qr-access-title">Acesso por QR Code</h3>
          <p className="qr-access-subtitle">Funcionários escaneiam para marcar presença</p>
        </div>
      </div>

      <div className="qr-canvas-wrapper">
        <canvas ref={canvasRef} />
        {timeLeft <= 5 && timeLeft > 0 && (
          <div className="qr-expiring-overlay">Atualizando...</div>
        )}
      </div>

      <div className="qr-code-display">
        <span className="qr-code-label">Código atual</span>
        <span className="qr-code-value">{currentCode || '------'}</span>
      </div>

      <div className="qr-timer-row">
        <svg width="48" height="48" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r="20" fill="none" stroke="#e2e8f0" strokeWidth="3" />
          <circle
            cx="26" cy="26" r="20" fill="none"
            stroke={timeLeft <= 8 ? '#e97316' : '#01696f'}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 26 26)"
            style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s' }}
          />
          <text x="26" y="31" textAnchor="middle" fontSize="13" fontWeight="700"
            fill={timeLeft <= 8 ? '#e97316' : '#0f3638'}>
            {timeLeft}s
          </text>
        </svg>
        <span className="qr-timer-label">próximo código em {timeLeft}s</span>
      </div>
    </div>
  );
};

export default QRCodePanel;
