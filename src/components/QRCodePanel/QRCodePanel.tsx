import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useAccessCode } from '../../hooks/useAccessCode';
import { RefreshCw, Copy, Check, Smartphone } from 'lucide-react';

interface Props {
  baseUrl: string;
}

export default function QRCodePanel({ baseUrl }: Props) {
  const { currentCode, timeLeft } = useAccessCode(true);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied]   = useState(false);
  const [qrReady, setQrReady] = useState(false);

  const kioskUrl = `${baseUrl}&code=${currentCode}`;

  useEffect(() => {
    if (!currentCode || !canvasRef.current) return;
    setQrReady(false);
    QRCode.toCanvas(canvasRef.current, kioskUrl, {
      width: 220,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(() => setQrReady(true)).catch(() => {});
  }, [kioskUrl, currentCode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(kioskUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const progress = (timeLeft / 30) * 100;
  const isExpiring = timeLeft <= 8;

  return (
    // max-w-xl limita a ~576px — nunca estica em telas ultrawide
    <div className="w-full max-w-xl bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 bg-teal-50/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-gray-900 leading-none">QR de Presença</p>
            <p className="text-[11px] text-teal-700 font-medium mt-0.5">Escaneie para registrar presença</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${
          isExpiring ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-700'
        }`}>
          <RefreshCw className={`w-3 h-3 ${isExpiring ? 'animate-spin' : ''}`} />
          {timeLeft}s
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-4 sm:p-6">

        {/* QR Code */}
        <div className="relative shrink-0">
          <div className="relative inline-flex">
            <div className={`p-3 rounded-2xl border-2 transition-colors ${
              isExpiring ? 'border-red-300 bg-red-50/30' : 'border-teal-200 bg-teal-50/20'
            }`}>
              <canvas
                ref={canvasRef}
                className={`block rounded-xl transition-opacity duration-300 ${
                  qrReady ? 'opacity-100' : 'opacity-30'
                }`}
                style={{ width: 180, height: 180 }}
              />
              {!qrReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-teal-500/30 border-t-teal-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="absolute bottom-0 left-3 right-3 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isExpiring ? 'bg-red-500' : 'bg-teal-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Info lateral */}
        <div className="flex flex-col items-center sm:items-start gap-4 w-full min-w-0">

          {/* Código numérico */}
          <div className="w-full">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 text-center sm:text-left">
              Código manual
            </p>
            <div className={`flex items-center justify-center sm:justify-start gap-1 transition-colors ${
              isExpiring ? 'text-red-600' : 'text-gray-900'
            }`}>
              {currentCode.split('').map((digit, i) => (
                <span
                  key={i}
                  className={`w-9 h-11 flex items-center justify-center text-2xl font-black rounded-xl border-2 transition-colors tabular-nums ${
                    isExpiring
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {digit}
                </span>
              ))}
            </div>
          </div>

          {/* Instruções */}
          <div className="bg-gray-50 rounded-xl p-3 w-full border border-gray-100">
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Como usar</p>
            <ol className="space-y-1">
              {[
                'Escaneie o QR com a câmera do celular',
                'Ou acesse o link e digite o código',
                'Selecione seu nome e confirme presença',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="w-4 h-4 bg-teal-600 text-white rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-px">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Botão copiar link */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-600 transition-all active:scale-95"
          >
            {copied
              ? <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">Link copiado!</span></>
              : <><Copy className="w-3.5 h-3.5" />Copiar link do kiosk</>
            }
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className={`px-4 sm:px-6 py-2.5 text-[11px] font-medium text-center border-t transition-colors ${
        isExpiring
          ? 'bg-red-50 border-red-100 text-red-600'
          : 'bg-gray-50 border-gray-100 text-gray-400'
      }`}>
        {isExpiring
          ? `⚠️ Código expira em ${timeLeft}s — um novo será gerado automaticamente`
          : `Código válido por ${timeLeft}s · renova automaticamente a cada 30 segundos`
        }
      </div>
    </div>
  );
}
