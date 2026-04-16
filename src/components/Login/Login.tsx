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
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#020617]"
    >
      {/* ── Background Elements ───────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(rgba(59,130,246,0.1) 1px, transparent 1px),
            linear-gradient(rgba(59,130,246,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px, 48px 48px, 48px 48px',
        }}
      />

      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none animate-pulse duration-[10s]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none animate-pulse duration-[8s]" />

      {/* ── Main Container ────────────────────────────────────────────── */}
      <div className="relative w-full max-w-[420px] z-10">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10 space-y-4">
          <div className="relative group">
            <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.3)] border border-blue-400/30 group-hover:scale-105 transition-transform duration-500">
              <Activity className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute -inset-2 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          </div>
          
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
              VONIXX
            </h1>
            <div className="flex items-center justify-center gap-3">
              <div className="h-[1px] w-6 bg-blue-500/40" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">
                Logística e Inteligência Operacional
              </span>
              <div className="h-[1px] w-6 bg-blue-500/40" />
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div 
          className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]"
          style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 32px 64px -16px rgba(0,0,0,0.6)' }}
        >
          <div className="p-8 sm:p-10 space-y-8">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">Acesso ao Sistema</h2>
              <p className="text-slate-400 text-xs font-medium">Selecione seu cargo para entrar na dashboard.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Profile Selector */}
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">
                  Selecione seu Perfil
                </label>
                
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedShiftLogin('SUPERVISAO')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${
                      selectedShiftLogin === 'SUPERVISAO'
                        ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                        : 'bg-white/5 border-transparent hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${selectedShiftLogin === 'SUPERVISAO' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <Shield className="w-4 h-4" />
                      </div>
                      <span className={`font-bold text-sm ${selectedShiftLogin === 'SUPERVISAO' ? 'text-white' : 'text-slate-300'}`}>
                        Setor de Supervisão
                      </span>
                    </div>
                    {selectedShiftLogin === 'SUPERVISAO' && (
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    )}
                  </button>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {(['A', 'B', 'C', 'D'] as const).map(shift => (
                      <button
                        key={shift}
                        type="button"
                        onClick={() => setSelectedShiftLogin(shift)}
                        className={`py-3.5 rounded-2xl border-2 font-black text-sm transition-all duration-300 ${
                          selectedShiftLogin === shift
                            ? 'bg-blue-600/10 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                            : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {shift}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Password */}
              {needsPassword && (
                <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">
                    Chave de Acesso
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword || ''}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="Senha do turno"
                      className="w-full bg-white/5 border-2 border-transparent focus:border-blue-500/50 focus:bg-white/10 rounded-2xl py-4 pl-12 pr-12 text-sm text-white outline-none transition-all placeholder:text-slate-600 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Error */}
              {loginError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in-95">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider">{loginError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="w-full group bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] text-xs py-5 rounded-2xl transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] flex items-center justify-center gap-3 border-t border-white/20"
              >
                <span>Entrar no Painel</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
        </div>

        {/* System Footer */}
        <div className="mt-8 flex items-center justify-end px-4">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            v 2.4.0
          </p>
        </div>
      </div>
    </div>
  );
}
