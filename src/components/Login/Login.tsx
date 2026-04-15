import React from 'react';
import { Activity } from 'lucide-react';

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
  loginError
}: LoginProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full space-y-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Activity className="w-8 h-8 text-blue-600" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Absenteísmo</h1>
          <p className="text-gray-500 mt-2">Escolha seu perfil para entrar.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Perfil / Turno</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setSelectedShiftLogin('SUPERVISAO')}
                className={`py-2 px-4 rounded-lg font-medium transition-colors col-span-2 ${
                  selectedShiftLogin === 'SUPERVISAO' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Supervisão
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {['A', 'B', 'C', 'D'].map(shift => (
                <button
                  key={shift}
                  type="button"
                  onClick={() => setSelectedShiftLogin(shift as ShiftType)}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                    selectedShiftLogin === shift 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {shift}
                </button>
              ))}
            </div>
          </div>

          {(selectedShiftLogin === 'A' || selectedShiftLogin === 'SUPERVISAO') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input 
                type="password" 
                value={loginPassword || ''}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Digite a senha"
                required
              />
            </div>
          )}

          {loginError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {loginError}
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-sm"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
