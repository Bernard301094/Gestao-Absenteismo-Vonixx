import React, { useState, useEffect } from 'react';
import { X, Fingerprint, ShieldCheck, ShieldOff } from 'lucide-react';

export const BIOMETRIC_KEY = 'vonixx_biometric_enabled';

interface BiometricToggleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BiometricToggleModal({ isOpen, onClose }: BiometricToggleModalProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEnabled(localStorage.getItem(BIOMETRIC_KEY) === 'true');
    }
  }, [isOpen]);

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(BIOMETRIC_KEY, String(next));
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '28px',
          width: '100%',
          maxWidth: '360px',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a, #3730a3)',
          padding: '20px 20px 20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Fingerprint size={18} color="#fff" />
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: '13px', margin: 0, letterSpacing: '-0.2px' }}>
                Segurança Biométrica
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 700, margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Bloqueio por huella dactilar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: '10px', padding: '8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} color="rgba(255,255,255,0.7)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Toggle card */}
          <div
            style={{
              background: enabled
                ? 'linear-gradient(135deg, #eef2ff, #f5f3ff)'
                : '#f9fafb',
              border: `1.5px solid ${enabled ? '#c7d2fe' : '#e5e7eb'}`,
              borderRadius: '20px',
              padding: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: enabled ? '#4f46e5' : '#e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.3s ease',
                flexShrink: 0,
              }}>
                {enabled
                  ? <ShieldCheck size={22} color="#fff" />
                  : <ShieldOff size={22} color="#9ca3af" />
                }
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '14px', color: '#111' }}>
                  Bloqueio por Huella
                </p>
                <p style={{
                  margin: '3px 0 0', fontSize: '11px', fontWeight: 600,
                  color: enabled ? '#4f46e5' : '#9ca3af',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  {enabled ? '✓ Ativado' : 'Desativado'}
                </p>
              </div>
            </div>

            {/* Toggle switch */}
            <button
              onClick={handleToggle}
              role="switch"
              aria-checked={enabled}
              style={{
                position: 'relative', flexShrink: 0,
                width: '54px', height: '30px',
                border: 'none', cursor: 'pointer',
                background: 'transparent', padding: 0,
              }}
            >
              <div style={{
                width: '100%', height: '100%', borderRadius: '50px',
                background: enabled ? '#4f46e5' : '#d1d5db',
                transition: 'background 0.3s ease',
              }} />
              <div style={{
                position: 'absolute', top: '4px',
                left: enabled ? '28px' : '4px',
                width: '22px', height: '22px',
                borderRadius: '50%', background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                transition: 'left 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
            </button>
          </div>

          {/* Info text */}
          <p style={{
            margin: '16px 4px 0', fontSize: '11.5px', color: '#6b7280',
            lineHeight: 1.6, fontWeight: 500,
          }}>
            {enabled
              ? '🔒 O app solicitará sua impressão digital ao abrir ou retornar do plano de fundo.'
              : '🔓 Quando ativado, o app solicitará sua impressão digital para desbloquear.'
            }
          </p>

          <p style={{
            margin: '8px 4px 0', fontSize: '10.5px', color: '#9ca3af',
            lineHeight: 1.5, fontWeight: 500,
          }}>
            A preferência é salva somente neste dispositivo.
          </p>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              marginTop: '20px', width: '100%',
              padding: '14px',
              background: enabled ? '#4f46e5' : '#f3f4f6',
              color: enabled ? '#fff' : '#374151',
              border: 'none', borderRadius: '16px',
              fontWeight: 800, fontSize: '12px',
              textTransform: 'uppercase', letterSpacing: '1.5px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: enabled ? '0 8px 24px rgba(79,70,229,0.3)' : 'none',
            }}
          >
            Confirmar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}
