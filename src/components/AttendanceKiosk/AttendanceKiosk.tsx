import React, { useState, useEffect, useRef } from 'react';
import { useAccessCode } from '../../hooks/useAccessCode';
import { db } from '../../firebase';
import {
  collection, onSnapshot, query, where,
  doc, setDoc, serverTimestamp
} from 'firebase/firestore';
import './AttendanceKiosk.css';

interface Employee {
  id: string;
  name: string;
  shift: string;
}

interface Props {
  prefilledCode?: string;
  shift?: string;
}

type Step = 'enter_code' | 'list' | 'confirm_self' | 'success';

export const AttendanceKiosk: React.FC<Props> = ({ prefilledCode = '', shift = 'A' }) => {
  const [step, setStep]               = useState<Step>('enter_code');
  const [inputCode, setInputCode]     = useState(prefilledCode);
  const [error, setError]             = useState('');
  const [savedIds, setSavedIds]       = useState<Set<string>>(new Set());
  // IDs marcados nesta sessão (para animação de saída antes do Firestore confirmar)
  const [localMarked, setLocalMarked] = useState<Set<string>>(new Set());
  const [dayLocked, setDayLocked]     = useState(false);
  const [employees, setEmployees]     = useState<Employee[]>([]);
  const [loadingEmps, setLoadingEmps] = useState(true);
  const [loadingAttend, setLoadingAttend] = useState(true);
  const [loadingLock, setLoadingLock] = useState(true);
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState<Employee | null>(null);
  const [marking, setMarking]         = useState(false);
  // IDs em animação de saída (fade-out antes de sumir)
  const [exitingIds, setExitingIds]   = useState<Set<string>>(new Set());
  const { validateCode }              = useAccessCode(false);
  const autoValidated                 = useRef(false);
  const searchRef                     = useRef<HTMLInputElement>(null);

  const today = new Date();
  const day   = today.getDate();
  const month = today.getMonth();
  const year  = today.getFullYear();

  // 1. Funcionários ativos do turno
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

  // 2. Presenças já salvas hoje
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

  // 3. Verifica se turno fechou o dia
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

  // Auto-valida código da URL
  useEffect(() => {
    if (autoValidated.current) return;
    if (!prefilledCode || prefilledCode.length !== 6) return;
    autoValidated.current = true;
    const timer = setTimeout(() => handleSubmitCode(prefilledCode), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Foca busca ao entrar na lista
  useEffect(() => {
    if (step === 'list') {
      setTimeout(() => searchRef.current?.focus(), 150);
    }
  }, [step]);

  const handleSubmitCode = async (code: string) => {
    setError('');
    const valid = await validateCode(code);
    if (!valid) {
      setError('Código inválido ou expirado. Solicite um novo código ao responsável do turno.');
      return;
    }
    setStep('list');
  };

  const handleSelectEmployee = (emp: Employee) => {
    setSelected(emp);
    setStep('confirm_self');
  };

  const handleConfirmPresence = async () => {
    if (!selected || marking) return;
    setMarking(true);

    // 1. Marca localmente com animação de saída IMEDIATA
    setExitingIds(prev => new Set([...prev, selected.id]));

    // 2. Salva no Firestore
    const docId = `${selected.shift}_${selected.id}_${year}_${month}_${day}`;
    await setDoc(
      doc(db, 'attendance', docId),
      {
        empId:     selected.id,
        day, month, year,
        status:    'P',
        note:      '',
        shift:     selected.shift,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 3. Após animação (400ms), move para marcados locais e vai para tela de sucesso
    setTimeout(() => {
      setLocalMarked(prev => new Set([...prev, selected.id]));
      setExitingIds(prev => { const n = new Set(prev); n.delete(selected.id); return n; });
    }, 380);

    setMarking(false);
    setStep('success');

    // Volta para lista após 2.5 segundos
    setTimeout(() => {
      setSearch('');
      setSelected(null);
      setStep('list');
    }, 2500);
  };

  const handleBack = () => {
    setSelected(null);
    setStep('list');
  };

  const isLoading = loadingEmps || loadingAttend || loadingLock;

  // Pendentes = não estão em savedIds nem em localMarked
  const pendingEmployees = employees.filter(
    e => !savedIds.has(e.id) && !localMarked.has(e.id)
  );

  // Filtro por busca (quando search >= 1 char)
  const visibleEmployees = search.length >= 1
    ? pendingEmployees.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase())
      )
    : pendingEmployees;

  const doneCount    = savedIds.size + localMarked.size;
  const pendingCount = pendingEmployees.length;
  const totalCount   = employees.length;
  const allDone      = !isLoading && pendingCount === 0 && totalCount > 0;

  const getInitials = (name: string) =>
    name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();

  return (
    <div className="kiosk-container">

      {/* ═══ TELA 1: Inserir código ═══ */}
      {step === 'enter_code' && (
        <div className="kiosk-card">
          <div className="kiosk-logo">🏭</div>
          <h2 className="kiosk-title">Registro de Presença</h2>
          <p className="kiosk-subtitle">Digite o código exibido no painel ou escaneie o QR Code</p>

          <div className="kiosk-input-group">
            <input
              className="kiosk-code-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={inputCode}
              onChange={e => setInputCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && inputCode.length === 6 && handleSubmitCode(inputCode)}
              autoFocus
            />
            <button
              className="kiosk-btn-primary"
              onClick={() => handleSubmitCode(inputCode)}
              disabled={inputCode.length < 6}
            >
              Entrar →
            </button>
          </div>

          {error && <p className="kiosk-error-msg">{error}</p>}
          <div className="kiosk-shift-badge">Turno {shift}</div>
        </div>
      )}

      {/* ═══ TELA 2: Lista de pendentes ═══ */}
      {step === 'list' && (
        <div className="kiosk-card kiosk-card-wide">

          {/* Header com contadores */}
          <div className="kiosk-attendance-header">
            <h2 className="kiosk-title">Marcar Presença</h2>
            <div className="kiosk-shift-badge">Turno {shift}</div>
          </div>

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
          ) : allDone ? (
            <div className="kiosk-all-done">
              <div className="kiosk-done-emoji kiosk-bounce">🎉</div>
              <h3>Todos presentes!</h3>
              <p>Todos os {totalCount} colaboradores do Turno {shift} já registraram presença hoje.</p>
            </div>
          ) : (
            <>
              {/* Contadores */}
              <div className="kiosk-counters">
                <div className="kiosk-counter kiosk-counter-done">
                  <span className="kiosk-counter-num">{doneCount}</span>
                  <span className="kiosk-counter-lbl">Presentes</span>
                </div>
                <div className="kiosk-counter kiosk-counter-pending">
                  <span className="kiosk-counter-num">{pendingCount}</span>
                  <span className="kiosk-counter-lbl">Pendentes</span>
                </div>
                <div className="kiosk-counter kiosk-counter-total">
                  <span className="kiosk-counter-num">{totalCount}</span>
                  <span className="kiosk-counter-lbl">Total</span>
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="kiosk-progress-bar">
                <div
                  className="kiosk-progress-fill"
                  style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
                />
              </div>

              {/* Busca */}
              <div className="kiosk-search-wrapper" style={{ position: 'relative', width: '100%' }}>
                <span className="kiosk-search-icon">🔍</span>
                <input
                  ref={searchRef}
                  className="kiosk-search-input"
                  type="text"
                  placeholder="Filtrar por nome…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoComplete="off"
                />
                {search && (
                  <button className="kiosk-search-clear" onClick={() => setSearch('')}>×</button>
                )}
              </div>

              {/* Lista de pendentes */}
              <ul className="kiosk-employee-list">
                {visibleEmployees.map(emp => (
                  <li
                    key={emp.id}
                    className={`kiosk-employee-item kiosk-clickable ${
                      exitingIds.has(emp.id) ? 'kiosk-item-exit' : 'kiosk-item-enter'
                    }`}
                    onClick={() => !exitingIds.has(emp.id) && handleSelectEmployee(emp)}
                  >
                    <div className="kiosk-avatar kiosk-avatar-sm">{getInitials(emp.name)}</div>
                    <span className="kiosk-emp-name">{emp.name}</span>
                    <span className="kiosk-tap-hint">Toque para marcar →</span>
                  </li>
                ))}

                {visibleEmployees.length === 0 && search.length >= 1 && (
                  <li className="kiosk-empty-search">
                    Nenhum funcionário pendente encontrado para "<strong>{search}</strong>"
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
      )}

      {/* ═══ TELA 3: Confirmar presença ═══ */}
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
            <div className="kiosk-already-marked">
              ✅ Presença já registrada hoje!
            </div>
          ) : (
            <button
              className="kiosk-btn-primary kiosk-btn-confirm"
              onClick={handleConfirmPresence}
              disabled={marking}
            >
              {marking ? '⏳ Registrando…' : '✓ Confirmar minha presença'}
            </button>
          )}

          <button className="kiosk-btn-ghost" onClick={handleBack}>
            ← Não sou eu, voltar
          </button>

          <div className="kiosk-shift-badge" style={{ marginTop: '8px' }}>Turno {shift}</div>
        </div>
      )}

      {/* ═══ TELA 4: Sucesso ═══ */}
      {step === 'success' && selected && (
        <div className="kiosk-card kiosk-success-card">
          <div className="kiosk-done-emoji kiosk-bounce" style={{ fontSize: '64px' }}>🎉</div>
          <h2 className="kiosk-title" style={{ color: '#10b981' }}>Presença Registrada!</h2>
          <p className="kiosk-subtitle">
            <strong>{selected.name}</strong>, sua presença foi confirmada com sucesso.
          </p>
          <p className="kiosk-hint" style={{ marginTop: '16px' }}>
            Voltando em instantes…
          </p>
          <div className="kiosk-shift-badge" style={{ marginTop: '8px' }}>Turno {shift}</div>
        </div>
      )}

    </div>
  );
};

export default AttendanceKiosk;
