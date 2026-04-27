import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessCode } from '../../hooks/useAccessCode';
import { db } from '../../firebase';
import {
  collection, onSnapshot, query, where,
  doc, setDoc, serverTimestamp
} from 'firebase/firestore';
import './AttendanceKiosk.css';

const BC_CHANNEL = 'vonixx_kiosk_code';

interface Employee {
  id: string;
  name: string;
  shift: string;
}

interface Props {
  prefilledCode?: string;
  shift?: string;
}

type Step = 'enter_code' | 'search' | 'confirm_self' | 'success' | 'locked';

const SESSION_KEY = 'vonixx_kiosk_used_code';

// ─── Detecta se é aba relay (aberta pelo QR do celular) ─────────────────────
const _params       = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const IS_RELAY      = _params.get('relay') === '1';
const RELAY_CODE    = _params.get('code') || '';
const RELAY_SHIFT   = (_params.get('shift') || 'A').toUpperCase();

// ─── Aba Relay (componente separado, leve) ───────────────────────────────────
function RelayPage() {
  useEffect(() => {
    if (!RELAY_CODE) { window.close(); return; }
    const send = () => {
      try {
        const bc = new BroadcastChannel(BC_CHANNEL);
        bc.postMessage({ type: 'CODE', code: RELAY_CODE, shift: RELAY_SHIFT });
        bc.close();
      } catch {
        localStorage.setItem('vonixx_bc_fallback',
          JSON.stringify({ code: RELAY_CODE, shift: RELAY_SHIFT, ts: Date.now() }));
      }
      setTimeout(() => window.close(), 400);
    };
    // Pequeno delay garante que o kiosk já está escutando
    setTimeout(send, 100);
  }, []);

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg,#0f3638 0%,#01696f 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '1rem', color: 'white',
    }}>
      <div className="kiosk-spinner"
        style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.2)' }} />
      <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Enviando código ao painel…</p>
    </div>
  );
}

// ─── Kiosk Principal ─────────────────────────────────────────────────────────
export const AttendanceKiosk: React.FC<Props> = ({ prefilledCode = '', shift = 'A' }) => {
  // Renderiza aba relay imediatamente, sem nenhum outro hook
  if (IS_RELAY) return <RelayPage />;

  return <KioskMain prefilledCode={prefilledCode} shift={shift} />;
};

function KioskMain({ prefilledCode, shift }: { prefilledCode: string; shift: string }) {
  const [step, setStep]               = useState<Step>('enter_code');
  const [inputCode, setInputCode]     = useState(prefilledCode);
  const [error, setError]             = useState('');
  const [savedIds, setSavedIds]       = useState<Set<string>>(new Set());
  const [localMarked, setLocalMarked] = useState<Set<string>>(new Set());
  const [dayLocked, setDayLocked]     = useState(false);
  const [employees, setEmployees]     = useState<Employee[]>([]);
  const [loadingEmps, setLoadingEmps]       = useState(true);
  const [loadingAttend, setLoadingAttend]   = useState(true);
  const [loadingLock, setLoadingLock]       = useState(true);
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState<Employee | null>(null);
  const [marking, setMarking]         = useState(false);
  const [sessionCode, setSessionCode] = useState('');

  const { validateCode } = useAccessCode(false);
  const searchRef = useRef<HTMLInputElement>(null);
  // Ref estável para validateCode (evita re-registro do BroadcastChannel)
  const validateRef = useRef(validateCode);
  useEffect(() => { validateRef.current = validateCode; }, [validateCode]);

  const today = new Date();
  const day   = today.getDate();
  const month = today.getMonth();
  const year  = today.getFullYear();

  // ─── Processa código recebido (manual ou via scan) ───────────────────────
  const handleIncomingCode = useCallback(async (code: string) => {
    const usedCode = sessionStorage.getItem(SESSION_KEY);
    if (usedCode && usedCode === code) { setStep('locked'); return; }
    setError('');
    const valid = await validateRef.current(code);
    if (!valid) {
      setError('Código inválido ou expirado. Solicite um novo código ao responsável do turno.');
      setStep('enter_code');
      return;
    }
    setSessionCode(code);
    setSearch('');
    setSelected(null);
    setStep('search');
  }, []); // deps vazias — usa validateRef estável

  // ─── BroadcastChannel: escuta QR scans do celular ────────────────────────
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(BC_CHANNEL);
      bc.onmessage = (ev) => {
        if (ev.data?.type === 'CODE' && ev.data.code) {
          handleIncomingCode(ev.data.code);
        }
      };
      return () => bc.close();
    }
    // Fallback localStorage para Safari iOS < 15.4
    const iv = setInterval(() => {
      const raw = localStorage.getItem('vonixx_bc_fallback');
      if (!raw) return;
      try {
        const { code, ts } = JSON.parse(raw);
        if (Date.now() - ts < 5000) {
          localStorage.removeItem('vonixx_bc_fallback');
          handleIncomingCode(code);
        }
      } catch { /* noop */ }
    }, 300);
    return () => clearInterval(iv);
  }, [handleIncomingCode]);

  // ─── Auto-valida código da URL (sem relay) ───────────────────────────────
  const autoValidated = useRef(false);
  useEffect(() => {
    if (autoValidated.current || !prefilledCode || prefilledCode.length !== 6) return;
    autoValidated.current = true;
    setTimeout(() => handleIncomingCode(prefilledCode), 600);
  }, [prefilledCode, handleIncomingCode]);

  // ─── Foca busca ao entrar na tela search ─────────────────────────────────
  useEffect(() => {
    if (step === 'search') setTimeout(() => searchRef.current?.focus(), 150);
  }, [step]);

  // ─── Firestore: funcionários do turno ────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'employees'), where('shift', '==', shift));
    return onSnapshot(q, snap => {
      const emps: Employee[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (!data.dismissed) emps.push({ id: d.id, name: data.name, shift: data.shift });
      });
      setEmployees(emps.sort((a, b) => a.name.localeCompare(b.name)));
      setLoadingEmps(false);
    });
  }, [shift]);

  // ─── Firestore: presenças de hoje ─────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'attendance'),
      where('shift', '==', shift),
      where('day',   '==', day),
      where('month', '==', month),
      where('year',  '==', year)
    );
    return onSnapshot(q, snap => {
      const saved = new Set<string>();
      snap.forEach(d => saved.add(d.data().empId));
      setSavedIds(saved);
      setLoadingAttend(false);
    });
  }, [shift, day, month, year]);

  // ─── Firestore: dia fechado ────────────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'completions'),
      where('shift', '==', shift),
      where('day',   '==', day),
      where('month', '==', month),
      where('year',  '==', year)
    );
    return onSnapshot(q, snap => {
      setDayLocked(!snap.empty);
      setLoadingLock(false);
    });
  }, [shift, day, month, year]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectEmployee = (emp: Employee) => {
    setSelected(emp);
    setStep('confirm_self');
  };

  const handleConfirmPresence = async () => {
    if (!selected || marking) return;
    setMarking(true);
    const docId = `${selected.shift}_${selected.id}_${year}_${month}_${day}`;
    await setDoc(
      doc(db, 'attendance', docId),
      {
        empId: selected.id, day, month, year,
        status: 'P', note: '', shift: selected.shift,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    setLocalMarked(prev => new Set([...prev, selected.id]));
    sessionStorage.setItem(SESSION_KEY, sessionCode);
    setMarking(false);
    setStep('success');
    setTimeout(() => setStep('locked'), 3000);
  };

  // ─── Busca filtrada ────────────────────────────────────────────────────────
  const isLoading   = loadingEmps || loadingAttend || loadingLock;
  const suggestions = search.length >= 1
    ? employees.filter(e =>
        !savedIds.has(e.id) &&
        !localMarked.has(e.id) &&
        e.name.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 6)
    : [];

  const getInitials = (name: string) =>
    name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="kiosk-container">

      {/* ══ TELA 1: Inserir código manualmente ══════════════════════════════ */}
      {step === 'enter_code' && (
        <div className="kiosk-card">
          <div className="kiosk-logo">🏭</div>
          <h2 className="kiosk-title">Registro de Presença</h2>
          <p className="kiosk-subtitle">
            Escaneie o QR Code com seu celular ou digite o código manualmente
          </p>
          <div className="kiosk-input-group">
            <input
              className="kiosk-code-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={inputCode}
              onChange={e => setInputCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && inputCode.length === 6 && handleIncomingCode(inputCode)}
              autoFocus
            />
            <button
              className="kiosk-btn-primary"
              onClick={() => handleIncomingCode(inputCode)}
              disabled={inputCode.length < 6}
            >
              Entrar →
            </button>
          </div>
          {error && <p className="kiosk-error-msg">{error}</p>}
          <p className="kiosk-hint">💡 O QR Code abre automaticamente esta tela no painel</p>
          <div className="kiosk-shift-badge">Turno {shift}</div>
        </div>
      )}

      {/* ══ TELA 2: Buscar funcionário ═══════════════════════════════════════ */}
      {step === 'search' && (
        <div className="kiosk-card">
          <h2 className="kiosk-title">Marcar Presença</h2>
          <p className="kiosk-subtitle">Digite seu nome para encontrar seu registro</p>

          {isLoading ? (
            <div className="kiosk-loading">
              <div className="kiosk-spinner" />
              <p>Carregando…</p>
            </div>
          ) : dayLocked ? (
            <div className="kiosk-all-done">
              <div className="kiosk-done-emoji">✅</div>
              <h3>Lançamento fechado</h3>
              <p>O Turno {shift} já registrou o lançamento de hoje.</p>
            </div>
          ) : (
            <>
              <div className="kiosk-search-wrapper" style={{ position: 'relative', width: '100%' }}>
                <span className="kiosk-search-icon">🔍</span>
                <input
                  ref={searchRef}
                  className="kiosk-search-input"
                  type="text"
                  placeholder="Digite seu nome…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {search && (
                  <button className="kiosk-search-clear" onClick={() => setSearch('')}>×</button>
                )}
                {suggestions.length > 0 && (
                  <ul className="kiosk-suggestions">
                    {suggestions.map(emp => (
                      <li
                        key={emp.id}
                        className="kiosk-suggestion-item"
                        onMouseDown={e => { e.preventDefault(); handleSelectEmployee(emp); }}
                        onTouchEnd={e => { e.preventDefault(); handleSelectEmployee(emp); }}
                      >
                        <div className="kiosk-avatar kiosk-avatar-sm">{getInitials(emp.name)}</div>
                        {emp.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {search.length >= 1 && suggestions.length === 0 && (
                <p className="kiosk-no-results">Nenhum funcionário pendente encontrado para "{search}"</p>
              )}
              {search.length === 0 && (
                <p className="kiosk-hint">Comece a digitar para filtrar os funcionários do Turno {shift}</p>
              )}
            </>
          )}
          <div className="kiosk-shift-badge">Turno {shift}</div>
        </div>
      )}

      {/* ══ TELA 3: Confirmar presença ═══════════════════════════════════════ */}
      {step === 'confirm_self' && selected && (
        <div className="kiosk-card">
          <h2 className="kiosk-title">Confirmar Presença</h2>
          <p className="kiosk-subtitle">Esse é você? Confirme para registrar sua presença.</p>
          <div className="kiosk-confirm-card">
            <div className="kiosk-avatar kiosk-avatar-lg">{getInitials(selected.name)}</div>
            <div className="kiosk-confirm-info">
              <p className="kiosk-confirm-name">{selected.name}</p>
              <p className="kiosk-confirm-shift">Turno {selected.shift}</p>
            </div>
          </div>
          {savedIds.has(selected.id) || localMarked.has(selected.id) ? (
            <div className="kiosk-already-marked">✅ Presença já registrada hoje!</div>
          ) : (
            <button
              className="kiosk-btn-primary kiosk-btn-confirm"
              onClick={handleConfirmPresence}
              disabled={marking}
            >
              {marking ? '⏳ Registrando…' : '✓ Confirmar minha presença'}
            </button>
          )}
          <p className="kiosk-hint" style={{ marginTop: '4px' }}>
            ⚠️ Para registrar outro funcionário, escaneie um novo QR Code
          </p>
          <div className="kiosk-shift-badge">Turno {shift}</div>
        </div>
      )}

      {/* ══ TELA 4: Sucesso ══════════════════════════════════════════════════ */}
      {step === 'success' && selected && (
        <div className="kiosk-card" style={{ textAlign: 'center', gap: '1.25rem' }}>
          <div style={{ fontSize: '64px' }}>🎉</div>
          <h2 className="kiosk-title" style={{ color: '#10b981' }}>Presença Registrada!</h2>
          <p className="kiosk-subtitle">
            <strong>{selected.name}</strong>, sua presença foi confirmada com sucesso.
          </p>
          <p className="kiosk-hint" style={{ marginTop: '16px' }}>
            Para marcar outro funcionário, escaneie um novo QR Code.
          </p>
          <div className="kiosk-shift-badge">Turno {shift}</div>
        </div>
      )}

      {/* ══ TELA 5: Bloqueado ════════════════════════════════════════════════ */}
      {step === 'locked' && (
        <div className="kiosk-card" style={{ textAlign: 'center', gap: '1.25rem' }}>
          <div style={{ fontSize: '3rem' }}>🔒</div>
          <h2 className="kiosk-title">Sessão encerrada</h2>
          <p className="kiosk-subtitle">Este código QR já foi utilizado nesta sessão.</p>
          <div style={{
            background: '#f0fdfa', border: '2px solid #99f6e4',
            borderRadius: '14px', padding: '1rem',
            color: '#01696f', fontWeight: 700, fontSize: '0.95rem',
          }}>
            📱 Escaneie um novo QR Code para registrar outra presença
          </div>
          <p className="kiosk-hint">O código renova automaticamente a cada 30 segundos</p>
          <div className="kiosk-shift-badge">Turno {shift}</div>
        </div>
      )}

    </div>
  );
}

export default AttendanceKiosk;
