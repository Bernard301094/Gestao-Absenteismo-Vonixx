import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessCode } from '../../hooks/useAccessCode';
import { db } from '../../firebase';
import {
  collection, onSnapshot, query, where,
  doc, setDoc, serverTimestamp
} from 'firebase/firestore';
import './AttendanceKiosk.css';

// ─── ZXing para leitura do QR com câmera ─────────────────────────────────────
// Importado dinamicamente para não aumentar o bundle inicial
let _zxingReader: any = null;
async function getZXingReader() {
  if (_zxingReader) return _zxingReader;
  const { BrowserQRCodeReader } = await import('@zxing/browser');
  _zxingReader = new BrowserQRCodeReader();
  return _zxingReader;
}

interface Employee {
  id: string;
  name: string;
  shift: string;
}

interface Props {
  shift?: string;
}

type Step = 'scanning' | 'manual' | 'search' | 'confirm_self' | 'success' | 'locked';

const SESSION_KEY = 'vonixx_kiosk_used_code';

export const AttendanceKiosk: React.FC<Props> = ({ shift = 'A' }) => {
  const [step, setStep]               = useState<Step>('scanning');
  const [inputCode, setInputCode]     = useState('');
  const [error, setError]             = useState('');
  const [cameraError, setCameraError] = useState('');
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
  const [scanning, setScanning]       = useState(false);

  const { validateCode } = useAccessCode(false);
  const validateRef = useRef(validateCode);
  useEffect(() => { validateRef.current = validateCode; }, [validateCode]);

  const searchRef   = useRef<HTMLInputElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const scannerRef  = useRef<{ stop: () => void } | null>(null);

  const today = new Date();
  const day   = today.getDate();
  const month = today.getMonth();
  const year  = today.getFullYear();

  // ─── Valida o código e avança ─────────────────────────────────────────────
  const handleIncomingCode = useCallback(async (raw: string) => {
    // Extrai só o código: se for uma URL completa pega o param ?code=
    // ou os últimos 6 dígitos, ou o texto direto
    let code = raw.trim();
    try {
      const u = new URL(code);
      code = u.searchParams.get('code') || code;
    } catch { /* não é URL, usa como está */ }
    // Garante apenas dígitos e exatamente 6
    code = code.replace(/\D/g, '').slice(-6);
    if (code.length !== 6) return; // QR inválido, ignora silenciosamente

    // Já usado nesta sessão?
    const usedCode = sessionStorage.getItem(SESSION_KEY);
    if (usedCode && usedCode === code) { setStep('locked'); return; }

    const valid = await validateRef.current(code);
    if (!valid) {
      setError('Código inválido ou expirado. Aguarde o próximo código no painel.');
      return;
    }
    stopScanner();
    setSessionCode(code);
    setSearch('');
    setSelected(null);
    setError('');
    setStep('search');
  }, []);

  // ─── ZXing: inicia leitura da câmera ──────────────────────────────────────
  const startScanner = useCallback(async () => {
    if (!videoRef.current) return;
    setScanning(true);
    setCameraError('');
    try {
      const reader = await getZXingReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined, // usa câmera traseira padrão
        videoRef.current,
        (result: any, err: any) => {
          if (result) {
            handleIncomingCode(result.getText());
          }
        }
      );
      scannerRef.current = controls;
    } catch (e: any) {
      setScanning(false);
      if (e?.name === 'NotAllowedError') {
        setCameraError('Permissão de câmera negada. Use o código manual.');
      } else {
        setCameraError('Câmera não disponível. Use o código manual.');
      }
      setStep('manual');
    }
  }, [handleIncomingCode]);

  const stopScanner = useCallback(() => {
    try { scannerRef.current?.stop(); } catch { /* noop */ }
    scannerRef.current = null;
    setScanning(false);
  }, []);

  // ─── Inicia câmera ao montar / volta para scanning ────────────────────────
  useEffect(() => {
    if (step === 'scanning') {
      startScanner();
    } else {
      stopScanner();
    }
    return () => { if (step === 'scanning') stopScanner(); };
  }, [step]); // eslint-disable-line

  // ─── Foca campo de busca ao entrar em search ─────────────────────────────
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

  // ─── Firestore: presenças de hoje ────────────────────────────────────────
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

  // ─── Firestore: dia fechado ───────────────────────────────────────────────
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

  // ─── Handlers ────────────────────────────────────────────────────────────
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

  // ─── Busca filtrada ───────────────────────────────────────────────────────
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

      {/* ══ TELA 1: Câmera ══════════════════════════════════════════════════ */}
      {step === 'scanning' && (
        <div className="kiosk-card kiosk-card-wide">
          <div className="kiosk-logo">📷</div>
          <h2 className="kiosk-title">Aponte o QR Code para a câmera</h2>
          <p className="kiosk-subtitle">O registro será feito automaticamente ao detectar o código</p>

          {/* Viewfinder */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: 360,
            aspectRatio: '1',
            margin: '0 auto',
            borderRadius: 16,
            overflow: 'hidden',
            background: '#0f172a',
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          }}>
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              muted
              playsInline
              autoPlay
            />
            {/* Cantos do viewfinder */}
            {['top-left','top-right','bottom-left','bottom-right'].map(pos => (
              <div key={pos} style={{
                position: 'absolute',
                width: 28, height: 28,
                borderColor: '#01696f',
                borderStyle: 'solid',
                borderWidth: 0,
                ...(pos.includes('top')    ? { top: 12 }    : { bottom: 12 }),
                ...(pos.includes('left')   ? { left: 12, borderLeftWidth: 4, borderTopWidth: pos.includes('top') ? 4 : 0, borderBottomWidth: pos.includes('bottom') ? 4 : 0 }
                                           : { right: 12, borderRightWidth: 4, borderTopWidth: pos.includes('top') ? 4 : 0, borderBottomWidth: pos.includes('bottom') ? 4 : 0 }),
                borderRadius: 4,
              }} />
            ))}
            {/* Linha de scan animada */}
            {scanning && (
              <div style={{
                position: 'absolute',
                left: 0, right: 0,
                height: 2,
                background: 'linear-gradient(90deg, transparent, #01696f, transparent)',
                animation: 'kiosk-scan-line 2s ease-in-out infinite',
              }} />
            )}
          </div>

          {error && <p className="kiosk-error-msg">{error}</p>}

          <button
            className="kiosk-btn-ghost"
            style={{ marginTop: 4 }}
            onClick={() => { stopScanner(); setStep('manual'); }}
          >
            ✏️ Digitar código manualmente
          </button>

          <div className="kiosk-shift-badge">Turno {shift}</div>
        </div>
      )}

      {/* ══ TELA 1b: Código manual ══════════════════════════════════════════ */}
      {step === 'manual' && (
        <div className="kiosk-card">
          <div className="kiosk-logo">🏭</div>
          <h2 className="kiosk-title">Registro de Presença</h2>
          <p className="kiosk-subtitle">Digite o código exibido no painel do responsável</p>

          {cameraError && <p className="kiosk-error-msg">{cameraError}</p>}

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

          <button
            className="kiosk-btn-ghost"
            onClick={() => { setError(''); setInputCode(''); setStep('scanning'); }}
          >
            📷 Voltar para a câmera
          </button>

          <div className="kiosk-shift-badge">Turno {shift}</div>
        </div>
      )}

      {/* ══ TELA 2: Buscar funcionário ══════════════════════════════════════ */}
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
                  autoComplete="off" autoCorrect="off" spellCheck={false}
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

      {/* ══ TELA 3: Confirmar presença ══════════════════════════════════════ */}
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
          <p className="kiosk-hint" style={{ marginTop: 4 }}>
            ⚠️ Para registrar outro funcionário, escaneie um novo QR Code
          </p>
          <div className="kiosk-shift-badge">Turno {shift}</div>
        </div>
      )}

      {/* ══ TELA 4: Sucesso ══════════════════════════════════════════════════ */}
      {step === 'success' && selected && (
        <div className="kiosk-card" style={{ textAlign: 'center', gap: '1.25rem' }}>
          <div style={{ fontSize: 64 }}>🎉</div>
          <h2 className="kiosk-title" style={{ color: '#10b981' }}>Presença Registrada!</h2>
          <p className="kiosk-subtitle">
            <strong>{selected.name}</strong>, sua presença foi confirmada com sucesso.
          </p>
          <p className="kiosk-hint" style={{ marginTop: 16 }}>
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
            borderRadius: 14, padding: '1rem',
            color: '#01696f', fontWeight: 700, fontSize: '0.95rem',
          }}>
            📱 Escaneie um novo QR Code para registrar outra presença
          </div>
          <p className="kiosk-hint">O código renova automaticamente a cada 30 segundos</p>
          <button
            className="kiosk-btn-ghost"
            onClick={() => { setStep('scanning'); setError(''); }}
          >
            📷 Escanear próximo QR
          </button>
          <div className="kiosk-shift-badge">Turno {shift}</div>
        </div>
      )}

    </div>
  );
};

export default AttendanceKiosk;
