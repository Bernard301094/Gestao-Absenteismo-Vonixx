import React, { useState } from 'react';
import { Activity, Eye, EyeOff, Lock, ChevronRight, Shield } from 'lucide-react';

type ShiftType = 'A' | 'B' | 'C' | 'D' | 'SUPERVISAO';

interface LoginProps {
  handleLogin: (e: React.FormEvent) => void;
  selectedShiftLogin: ShiftType;
  setSelectedShiftLogin: (shift: ShiftType) => void;
  loginPassword?: string;
  setLoginPassword: (password: string) => void;
  loginError?: string;
}

export default function Login({
  handleLogin,
  selectedShiftLogin,
  setSelectedShiftLogin,
  loginPassword,
  setLoginPassword,
  loginError,
}: LoginProps) {
  const [showPassword, setShowPassword] = useState(false);
  const needsPassword = selectedShiftLogin === 'A' || selectedShiftLogin === 'SUPERVISAO';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 40%, #0a2a5c 70%, #071020 100%)' }}
    >
      {/* ── Blueprint grid background ──────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── Subtle glow orbs ───────────────────────────────────────────── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20%', left: '-10%',
          width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-15%', right: '-10%',
          width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(29,78,216,0.10) 0%, transparent 70%)',
        }}
      />

      {/* ── Corner industrial marks ────────────────────────────────────── */}
      {[
        'top-4 left-4 border-t border-l',
        'top-4 right-4 border-t border-r',
        'bottom-4 left-4 border-b border-l',
        'bottom-4 right-4 border-b border-r',
      ].map((cls, i) => (
        <div
          key={i}
          className={`absolute w-8 h-8 ${cls} border-blue-500/20 pointer-events-none`}
        />
      ))}

      {/* ── Card ───────────────────────────────────────────────────────── */}
      <div
        className="relative w-full max-w-md"
        style={{
          background: 'rgba(255,255,255,0.045)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 24,
          boxShadow: `
            0 0 0 1px rgba(59,130,246,0.08),
            0 32px 64px rgba(0,0,0,0.5),
            0 8px 32px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.07)
          `,
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-6 right-6 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent)' }}
        />

        <div className="p-8 space-y-7">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex flex-col items-center gap-4">
            {/* Logo mark */}
            <div className="relative">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.3) 0%, rgba(29,78,216,0.15) 100%)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  boxShadow: '0 0 32px rgba(37,99,235,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                <Activity className="w-8 h-8 text-blue-400" strokeWidth={1.5} />
              </div>
              {/* Pulse ring */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  border: '1px solid rgba(59,130,246,0.15)',
                  transform: 'scale(1.2)',
                  animation: 'pulse 3s ease-in-out infinite',
                }}
              />
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="h-px w-8 bg-blue-500/30" />
                <span className="text-[9px] font-black text-blue-400/60 uppercase tracking-[0.3em]">
                  Vonixx Industrial
                </span>
                <div className="h-px w-8 bg-blue-500/30" />
              </div>
              <h1 className="text-xl font-black text-white leading-tight tracking-tight">
                Dashboard de Absenteísmo
              </h1>
              <p className="text-blue-300/40 text-xs font-medium mt-1">
                Selecione seu perfil para acessar o sistema
              </p>
            </div>
          </div>

          {/* ── Form ───────────────────────────────────────────────────── */}
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Profile/Shift selector */}
            <div className="space-y-2.5">
              <label className="block text-[10px] font-black text-blue-300/50 uppercase tracking-[0.2em]">
                Perfil / Turno
              </label>

              {/* Supervisão (full width) */}
              <button
                type="button"
                onClick={() => setSelectedShiftLogin('SUPERVISAO')}
                className="w-full relative flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200"
                style={{
                  background: selectedShiftLogin === 'SUPERVISAO'
                    ? 'linear-gradient(135deg, rgba(79,70,229,0.4), rgba(99,102,241,0.25))'
                    : 'rgba(255,255,255,0.04)',
                  border: selectedShiftLogin === 'SUPERVISAO'
                    ? '1px solid rgba(129,140,248,0.4)'
                    : '1px solid rgba(255,255,255,0.07)',
                  color: selectedShiftLogin === 'SUPERVISAO' ? '#a5b4fc' : 'rgba(255,255,255,0.35)',
                  boxShadow: selectedShiftLogin === 'SUPERVISAO'
                    ? '0 0 20px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.08)'
                    : 'none',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4" strokeWidth={2} />
                  <span>Supervisão</span>
                </div>
                {selectedShiftLogin === 'SUPERVISAO' && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="text-[10px] font-black tracking-wider text-indigo-300/70">ATIVO</span>
                  </div>
                )}
              </button>

              {/* Turnos A B C D */}
              <div className="grid grid-cols-4 gap-2">
                {(['A', 'B', 'C', 'D'] as const).map(shift => {
                  const isActive = selectedShiftLogin === shift;
                  return (
                    <button
                      key={shift}
                      type="button"
                      onClick={() => setSelectedShiftLogin(shift)}
                      className="relative py-3 rounded-xl font-black text-sm transition-all duration-200"
                      style={{
                        background: isActive
                          ? 'linear-gradient(135deg, rgba(37,99,235,0.5), rgba(29,78,216,0.3))'
                          : 'rgba(255,255,255,0.04)',
                        border: isActive
                          ? '1px solid rgba(96,165,250,0.4)'
                          : '1px solid rgba(255,255,255,0.07)',
                        color: isActive ? '#93c5fd' : 'rgba(255,255,255,0.3)',
                        boxShadow: isActive
                          ? '0 0 20px rgba(37,99,235,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                          : 'none',
                        transform: isActive ? 'translateY(-1px)' : 'none',
                      }}
                    >
                      {shift}
                      {isActive && (
                        <div
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                          style={{ background: 'rgba(96,165,250,0.8)' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Password field — only for A and SUPERVISAO */}
            {needsPassword && (
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-blue-300/50 uppercase tracking-[0.2em]">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <div
                    className="absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(96,165,250,0.4)' }}
                  >
                    <Lock className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword || ''}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pr-11 py-3.5 pl-10 rounded-xl text-sm font-medium outline-none transition-all duration-200 placeholder:text-white/15"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.09)',
                      color: 'rgba(255,255,255,0.9)',
                      caretColor: '#60a5fa',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.border = '1px solid rgba(96,165,250,0.4)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1), inset 0 2px 4px rgba(0,0,0,0.2)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)';
                      e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-150"
                    style={{ color: 'rgba(96,165,250,0.35)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(96,165,250,0.7)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(96,165,250,0.35)')}
                  >
                    {showPassword
                      ? <EyeOff className="w-4 h-4" strokeWidth={2} />
                      : <Eye className="w-4 h-4" strokeWidth={2} />
                    }
                  </button>
                </div>
              </div>
            )}

            {/* Error message */}
            {loginError && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 animate-pulse" />
                <p className="text-xs text-red-400 font-medium">{loginError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="group w-full relative flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-black text-sm text-white transition-all duration-250 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #1e40af 100%)',
                border: '1px solid rgba(96,165,250,0.3)',
                boxShadow: '0 4px 24px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.2)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.15)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Shimmer sweep on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)',
                }}
              />
              <span>Acessar Sistema</span>
              <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
            </button>
          </form>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <span className="text-[9px] font-black tracking-[0.25em] uppercase"
              style={{ color: 'rgba(96,165,250,0.2)' }}>
              Sistema Seguro · TLS 1.3
            </span>
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 left-6 right-6 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(29,78,216,0.3), transparent)' }}
        />
      </div>

      {/* Subtle pulse animation for logo ring */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1.2); }
          50%       { opacity: 0.1; transform: scale(1.35); }
        }
      `}</style>
    </div>
  );
}