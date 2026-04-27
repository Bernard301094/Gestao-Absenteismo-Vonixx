import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useAccessCode } from '../../hooks/useAccessCode';
import { RefreshCw, Copy, Check, QrCode } from 'lucide-react';

// O QR agora contém APENAS o código de 6 dígitos (texto puro)
// O kiosk lê com a própria câmera — sem abrir nenhuma URL, sem nova aba
export default function QRCodePanel() {
  const { currentCode, timeLeft } = useAccessCode(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied]   = useState(false);
  const [qrReady, setQrReady] = useState(false);

  const progress   = (timeLeft / 30) * 100;
  const isExpiring = timeLeft <= 8;

  useEffect(() => {
    if (!currentCode || !canvasRef.current) return;
    setQrReady(false);
    // QR contém APENAS os 6 dígitos — sem URL
    QRCode.toCanvas(canvasRef.current, currentCode, {
      width: 200,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(() => setQrReady(true)).catch(() => {});
  }, [currentCode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">

      {/* Header */}
      <div className={`flex items-center justify-between px-4 sm:px-6 py-3 border-b transition-colors ${
        isExpiring ? 'bg-red-50 border-red-100' : 'bg-teal-50/70 border-teal-100'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            isExpiring ? 'bg-red-500' : 'bg-teal-600'
          }`}>
            <QrCode className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-gray-900 leading-none">QR de Presença</p>
            <p className={`text-[11px] font-medium ${
              isExpiring ? 'text-red-600' : 'text-teal-700'
            }`}>Kiosk lê direto pela câmera — sem abrir link</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${
          isExpiring ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-700'
        }`}>
          <RefreshCw className={`w-3 h-3 ${isExpiring ? 'animate-spin' : ''}`} />
          {timeLeft}s
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col sm:flex-row gap-0">

        {/* QR */}
        <div className={`flex items-center justify-center p-5 sm:p-6 shrink-0 border-b sm:border-b-0 sm:border-r transition-colors ${
          isExpiring ? 'border-red-100 bg-red-50/30' : 'border-gray-100 bg-gray-50/50'
        }`}>
          <div className="relative">
            <div className={`p-2.5 rounded-2xl border-2 transition-colors ${
              isExpiring ? 'border-red-300' : 'border-teal-200'
            }`}>
              <canvas
                ref={canvasRef}
                className={`block rounded-xl transition-opacity duration-300 ${
                  qrReady ? 'opacity-100' : 'opacity-20'
                }`}
                style={{ width: 160, height: 160 }}
              />
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isExpiring ? 'bg-red-500' : 'bg-teal-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Código numérico */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Código manual</p>
            <div className={`flex items-center gap-1 ${
              isExpiring ? 'text-red-600' : 'text-gray-900'
            }`}>
              {currentCode.split('').map((digit, i) => (
                <span key={i} className={`w-9 h-11 flex items-center justify-center text-xl font-black rounded-xl border-2 tabular-nums transition-colors ${
                  isExpiring ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
                }`}>
                  {digit}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-gray-400">Renova a cada 30 segundos automaticamente</p>
          </div>

          {/* Instruções */}
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Como usar</p>
              <ol className="space-y-1.5">
                {[
                  'Mostre este QR ao tablet/kiosk da fábrica',
                  'A câmera do kiosk lê automaticamente',
                  'Selecione seu nome e confirme presença',
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="w-4 h-4 bg-teal-600 text-white rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-px">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-600 transition-all active:scale-95"
            >
              {copied
                ? <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">Código copiado!</span></>
                : <><Copy className="w-3.5 h-3.5" />Copiar código</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
