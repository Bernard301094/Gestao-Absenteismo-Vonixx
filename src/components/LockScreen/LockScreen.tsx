import React, { useEffect, useState, useCallback } from 'react';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Fingerprint, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
}

type AuthState = 'idle' | 'authenticating' | 'success' | 'error' | 'unavailable';

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const authenticate = useCallback(async () => {
    setAuthState('authenticating');
    setErrorMsg('');

    try {
      const { isAvailable } = await NativeBiometric.isAvailable();

      if (!isAvailable) {
        setAuthState('unavailable');
        setErrorMsg('Biometria não disponível neste dispositivo. Acesse via login.');
        return;
      }

      await NativeBiometric.verifyIdentity({
        reason: 'Desbloqueie o Vonixx Frequência',
        title: 'Autenticação',
        subtitle: 'Use sua impressão digital para continuar',
        description: 'Coloque o dedo no sensor de impressão digital',
        negativeButtonText: 'Cancelar',
        maxAttempts: 5,
      });

      setAuthState('success');
      setTimeout(() => onUnlock(), 400);
    } catch (err: any) {
      console.error('Biometric auth error:', err);
      const code = err?.code ?? err?.message ?? '';
      const isCancelled =
        code === '10' ||
        code === '13' ||
        String(code).includes('cancel') ||
        String(code).includes('Cancel') ||
        String(err).toLowerCase().includes('cancel');

      if (isCancelled) {
        setAuthState('idle');
      } else {
        setAuthState('error');
        setErrorMsg('Autenticação falhou. Tente novamente.');
      }
    }
  }, [onUnlock]);

  // Trigger automatically on mount
  useEffect(() => {
    const timer = setTimeout(() => authenticate(), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Decorative circles */}
      <div style={{
        position: 'absolute', top: '-120px', right: '-120px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'rgba(59,130,246,0.12)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-80px', left: '-80px',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'rgba(99,102,241,0.10)', pointerEvents: 'none',
      }} />

      {/* Logo / app identifier */}
      <div style={{ marginBottom: '48px', textAlign: 'center' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '20px',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 20px 60px rgba(99,102,241,0.4)',
        }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: '22px', letterSpacing: '-1px' }}>VA</span>
        </div>
        <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
          Vonixx <span style={{ color: '#93c5fd', fontStyle: 'italic' }}>Frequência</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginTop: '6px' }}>
          Aplicativo Bloqueado
        </p>
      </div>

      {/* Fingerprint button */}
      <button
        onClick={authenticate}
        disabled={authState === 'authenticating' || authState === 'success'}
        style={{
          width: '120px', height: '120px', borderRadius: '50%',
          border: '2px solid',
          borderColor: authState === 'success'
            ? '#10b981'
            : authState === 'error'
            ? '#f87171'
            : authState === 'authenticating'
            ? 'rgba(99,102,241,0.6)'
            : 'rgba(255,255,255,0.2)',
          background: authState === 'success'
            ? 'rgba(16,185,129,0.15)'
            : authState === 'error'
            ? 'rgba(239,68,68,0.12)'
            : 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: authState === 'authenticating' || authState === 'success' ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          backdropFilter: 'blur(10px)',
          boxShadow: authState === 'authenticating'
            ? '0 0 0 12px rgba(99,102,241,0.15), 0 0 0 24px rgba(99,102,241,0.07)'
            : authState === 'success'
            ? '0 0 0 16px rgba(16,185,129,0.15)'
            : '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {authState === 'success' ? (
          <ShieldCheck size={48} color="#10b981" />
        ) : authState === 'authenticating' ? (
          <Loader2 size={44} color="#a5b4fc" style={{ animation: 'spin 1s linear infinite' }} />
        ) : authState === 'error' ? (
          <AlertTriangle size={44} color="#f87171" />
        ) : (
          <Fingerprint
            size={52}
            color={authState === 'unavailable' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)'}
          />
        )}
      </button>

      {/* Status text */}
      <div style={{ marginTop: '32px', textAlign: 'center', maxWidth: '260px' }}>
        {authState === 'idle' && (
          <>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', fontWeight: 700, margin: 0 }}>
              Toque para desbloquear
            </p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '6px 0 0', lineHeight: 1.5 }}>
              Use sua impressão digital
            </p>
          </>
        )}
        {authState === 'authenticating' && (
          <p style={{ color: '#a5b4fc', fontSize: '14px', fontWeight: 700, margin: 0 }}>
            Verificando identidade...
          </p>
        )}
        {authState === 'success' && (
          <p style={{ color: '#10b981', fontSize: '14px', fontWeight: 700, margin: 0 }}>
            ✓ Desbloqueado com sucesso
          </p>
        )}
        {authState === 'error' && (
          <>
            <p style={{ color: '#f87171', fontSize: '14px', fontWeight: 700, margin: 0 }}>
              {errorMsg}
            </p>
            <button
              onClick={authenticate}
              style={{
                marginTop: '12px', background: 'none', border: '1px solid rgba(248,113,113,0.4)',
                color: '#f87171', padding: '8px 20px', borderRadius: '50px',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '1px',
              }}
            >
              Tentar novamente
            </button>
          </>
        )}
        {authState === 'unavailable' && (
          <>
            <p style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 700, margin: 0, lineHeight: 1.5 }}>
              {errorMsg}
            </p>
            <button
              onClick={onUnlock}
              style={{
                marginTop: '14px', background: 'rgba(251,191,36,0.15)',
                border: '1px solid rgba(251,191,36,0.3)',
                color: '#fbbf24', padding: '10px 24px', borderRadius: '50px',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '1px',
              }}
            >
              Continuar mesmo assim
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
