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

type Step = 'enter_code' | 'mark_attendance';

export const AttendanceKiosk: React.FC<Props> = ({ prefilledCode = '', shift = 'A' }) => {
  const [step, setStep]                   = useState<Step>('enter_code');
  const [inputCode, setInputCode]         = useState(prefilledCode);
  const [error, setError]                 = useState('');
  // IDs que JA possuem documento salvo hoje (qualquer status)
  const [savedIds, setSavedIds]           = useState<Set<string>>(new Set());
  // IDs marcados como P (presentes confirmados)
  const [presentIds, setPresentIds]       = useState<Set<string>>(new Set());
  const [lastMarked, setLastMarked]       = useState<string | null>(null);
  const [employees, setEmployees]         = useState<Employee[]>([]);
  const [loadingEmps, setLoadingEmps]     = useState(true);
  const [loadingAttend, setLoadingAttend] = useState(true);
  const [search, setSearch]               = useState('');
  const { validateCode }                  = useAccessCode(false);
  const autoValidated                     = useRef(false);

  const today = new Date();
  const day   = today.getDate();
  const month = today.getMonth();
  const year  = today.getFullYear();

  // Carrega funcionários ativos do turno
  useEffect(() => {
    const q = query(collection(db, 'employees'), where('shift', '==', shift));
    const unsub = onSnapshot(q, snap => {
      const emps: Employee[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (!data.dismissed) emps.push({ id: d.id, name: data.name, shift: data.shift });
      });
      setEmployees(emps.sort((a, b) => a.name.localeCompare(b.name)));
      setLoadingEmps(false);
    });
    return () => unsub();
  }, [shift]);

  // Escuta TODOS os documentos de attendance hoje para este turno.
  // - savedIds: quem JÁ tem qualquer documento (lançado manualmente ou via kiosk)
  // - presentIds: quem está com status 'P' explicitamente salvo
  useEffect(() => {
    const q = query(
      collection(db, 'attendance'),
      where('shift', '==', shift),
      where('day',   '==', day),
      where('month', '==', month),
      where('year',  '==', year)
    );
    const unsub = onSnapshot(q, snap => {
      const saved   = new Set<string>();
      const present = new Set<string>();
      snap.forEach(d => {
        const data = d.data();
        saved.add(data.empId);
        if (data.status === 'P') present.add(data.empId);
      });
      setSavedIds(saved);
      setPresentIds(present);
      setLoadingAttend(false);
    });
    return () => unsub();
  }, [shift, day, month, year]);

  // Auto-valida código da URL após TOTP inicializar
  useEffect(() => {
    if (autoValidated.current) return;
    if (!prefilledCode || prefilledCode.length !== 6) return;
    autoValidated.current = true;
    const timer = setTimeout(() => handleSubmitCode(prefilledCode), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitCode = async (code: string) => {
    setError('');
    const valid = await validateCode(code);
    if (!valid) {
      setError('Código inválido ou expirado. Solicite um novo QR ao supervisor.');
      return;
    }
    setStep('mark_attendance');
  };

  const handleMarkPresent = async (employee: Employee) => {
    if (savedIds.has(employee.id)) return;
    const docId = `${employee.shift}_${employee.id}_${year}_${month}_${day}`;
    await setDoc(
      doc(db, 'attendance', docId),
      {
        empId:     employee.id,
        day,
        month,
        year,
        status:    'P',
        note:      '',
        shift:     employee.shift,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    setLastMarked(employee.name);
    setTimeout(() => setLastMarked(null), 2500);
  };

  const isLoading = loadingEmps || loadingAttend;

  // Pendentes = funcionários SEM documento salvo hoje
  // (quem foi lançado manualmente no Lançar já tem doc = some da lista)
  const remaining = employees.filter(e => !savedIds.has(e.id));
  const filtered  = remaining.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  // Contador de presentes: salvos com P explícito + os sem doc (padrão P do Lançar)
  // Para o contador mostramos: total - pendentes = confirmados de alguma forma
  const confirmedCount = employees.length - remaining.length;
  const allDone = !isLoading && employees.length > 0 && remaining.length === 0;

  return (
    <div className="kiosk-container">

      {/* ── TELA 1: Inserir código ── */}
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

      {/* ── TELA 2: Marcar presença ── */}
      {step === 'mark_attendance' && (
        <div className="kiosk-card kiosk-card-wide">

          <div className="kiosk-attendance-header">
            <h2 className="kiosk-title">Marcar Presença</h2>
            <span className="kiosk-shift-badge">Turno {shift}</span>
          </div>

          {/* Contadores */}
          {!isLoading && (
            <div className="kiosk-counters">
              <div className="kiosk-counter kiosk-counter-done">
                <span className="kiosk-counter-num">{confirmedCount}</span>
                <span className="kiosk-counter-lbl">Confirmados</span>
              </div>
              <div className="kiosk-counter kiosk-counter-pending">
                <span className="kiosk-counter-num">{remaining.length}</span>
                <span className="kiosk-counter-lbl">Pendentes</span>
              </div>
              <div className="kiosk-counter kiosk-counter-total">
                <span className="kiosk-counter-num">{employees.length}</span>
                <span className="kiosk-counter-lbl">Total</span>
              </div>
            </div>
          )}

          {/* Toast */}
          {lastMarked && (
            <div className="kiosk-toast">
              ✅ {lastMarked} — Presença registrada!
            </div>
          )}

          {/* Spinner */}
          {isLoading && (
            <div className="kiosk-loading">
              <div className="kiosk-spinner" />
              <p>Carregando funcionários…</p>
            </div>
          )}

          {/* Todos confirmados */}
          {allDone && (
            <div className="kiosk-all-done">
              <div className="kiosk-done-emoji">🎉</div>
              <h3>Todos confirmados!</h3>
              <p>Todas as presenças do Turno {shift} já foram registradas hoje.</p>
            </div>
          )}

          {/* Buscador + lista de pendentes */}
          {!isLoading && !allDone && (
            <>
              <div className="kiosk-search-wrapper">
                <span className="kiosk-search-icon">🔍</span>
                <input
                  className="kiosk-search-input"
                  type="text"
                  placeholder="Buscar funcionário..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoComplete="off"
                />
                {search && (
                  <button className="kiosk-search-clear" onClick={() => setSearch('')}>×</button>
                )}
              </div>

              {filtered.length === 0 ? (
                <p className="kiosk-no-results">
                  {search
                    ? `Nenhum funcionário pendente encontrado para "${search}".`
                    : 'Nenhum funcionário pendente.'}
                </p>
              ) : (
                <ul className="kiosk-employee-list">
                  {filtered.map(emp => (
                    <li key={emp.id} className="kiosk-employee-item">
                      <div className="kiosk-avatar">{emp.name.charAt(0)}</div>
                      <span className="kiosk-emp-name">{emp.name}</span>
                      <button
                        className="kiosk-present-btn"
                        onClick={() => handleMarkPresent(emp)}
                      >
                        ✓ Presente
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceKiosk;
