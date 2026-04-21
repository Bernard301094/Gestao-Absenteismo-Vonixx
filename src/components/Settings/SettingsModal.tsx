import React, { useState, useEffect } from 'react';
import { X, Settings, Database, BrainCircuit, Save, Loader2, Key, Fingerprint, ShieldCheck, ShieldOff } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BIOMETRIC_KEY = 'vonixx_biometric_enabled';

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [config, setConfig] = useState({
    geminiKey: '',
    openrouterKey: '',
    groqKey: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      // Load biometric preference from localStorage
      const stored = localStorage.getItem(BIOMETRIC_KEY);
      setBiometricEnabled(stored === 'true');
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'system', 'ai_config'));
      if (snap.exists()) {
        const data = snap.data();
        setConfig({
          geminiKey: data.geminiKey || '',
          openrouterKey: data.openrouterKey || '',
          groqKey: data.groqKey || ''
        });
      }
    } catch (err) {
      console.error("Erro ao carregar configurações:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await setDoc(doc(db, 'system', 'ai_config'), {
        ...config,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setMessage({ text: 'Configurações salvas com sucesso!', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      setMessage({ text: 'Erro ao salvar. Verifique suas permissões.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleBiometricToggle = () => {
    const newValue = !biometricEnabled;
    setBiometricEnabled(newValue);
    localStorage.setItem(BIOMETRIC_KEY, String(newValue));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gray-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black uppercase tracking-tight text-sm">Configurações Gerais</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gerenciamento do Sistema</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">

          {/* ── Segurança Biométrica ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Fingerprint className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Segurança Biométrica</h3>
            </div>

            <div
              className="flex items-center justify-between p-4 rounded-2xl border transition-all duration-200"
              style={{
                background: biometricEnabled ? 'linear-gradient(135deg, #eef2ff, #f5f3ff)' : '#f9fafb',
                borderColor: biometricEnabled ? '#c7d2fe' : '#e5e7eb',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                  style={{ background: biometricEnabled ? '#4f46e5' : '#e5e7eb' }}
                >
                  {biometricEnabled
                    ? <ShieldCheck className="w-5 h-5 text-white" />
                    : <ShieldOff className="w-5 h-5 text-gray-400" />
                  }
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">Bloqueio por Huella</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">
                    {biometricEnabled ? 'Ativo — requer impressão digital' : 'Desativado'}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={handleBiometricToggle}
                role="switch"
                aria-checked={biometricEnabled}
                className="relative shrink-0 focus:outline-none"
                style={{ width: '52px', height: '28px' }}
              >
                <div
                  className="w-full h-full rounded-full transition-all duration-300"
                  style={{ background: biometricEnabled ? '#4f46e5' : '#d1d5db' }}
                />
                <div
                  className="absolute top-1 transition-all duration-300 w-5 h-5 rounded-full bg-white shadow-md"
                  style={{ left: biometricEnabled ? '28px' : '4px' }}
                />
              </button>
            </div>

            <p className="text-[11px] text-gray-400 font-medium leading-relaxed px-1">
              Quando ativado, o app solicitará sua impressão digital ao abrir ou retornar do plano de fundo.
              A preferência fica salva neste dispositivo.
            </p>
          </div>

          <div className="border-t border-gray-100" />

          {/* ── Inteligência Artificial ──────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Inteligência Artificial</h3>
            </div>
            <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
              Configure as chaves de API para garantir que o sistema funcione corretamente fora do ambiente de desenvolvimento. 
              As chaves salvas aqui têm prioridade sobre as variáveis de ambiente.
            </p>

            {loading ? (
              <div className="py-10 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="text-xs font-bold text-gray-400 uppercase">Carregando dados...</span>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Google Gemini API Key</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={config.geminiKey}
                      onChange={(e) => setConfig({ ...config, geminiKey: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                      placeholder="AIzaSy..."
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">OpenRouter API Key (Llama/Mistral)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Database className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={config.openrouterKey}
                      onChange={(e) => setConfig({ ...config, openrouterKey: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                      placeholder="sk-or-v1-..."
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Groq API Key</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <BrainCircuit className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={config.groqKey}
                      onChange={(e) => setConfig({ ...config, groqKey: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                      placeholder="gsk_..."
                    />
                  </div>
                </div>

                {message && (
                  <div className={`p-4 rounded-2xl text-xs font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
            Apenas administradores podem modificar estas chaves.
          </p>
        </div>
      </div>
    </div>
  );
}
