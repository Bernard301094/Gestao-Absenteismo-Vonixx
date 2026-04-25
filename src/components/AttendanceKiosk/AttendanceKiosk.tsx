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
  const [step, setStep] = useState<Step>('enter_code');
  const [inputCode, setInputCode] = useState(prefilledCode);
  const [error, setError] = useState('');
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [lastMarked, setLastMarked] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { validateCode } = useAccessCode(false);
  const autoValidated = useRef(false);

  useEffect(() => {
    const q = query(collection(db, 'employees'), where('shift', '==', shift));
    const unsub = onSnapshot(q, (snap) => {
      const emps: Employee[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (!data.dismissed) emps.push({ id: d.id, name: data.name, shift: data.shift });
      });
      setEmployees(emps.sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => unsub();
  }, [shift]);

  // Valida automaticamente o código da URL — aguarda 300ms para TOTP estar pronto
  useEffect(() => {
    if (autoValidated.current) return;
    if (!prefilledCode || prefilledCode.length !== 6) return;
    autoValidated.current = true;
    const timer = setTimeout(() => handleSubmitCode(prefilledCode), 300);
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
    if (markedIds.has(employee.id)) return;
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();

    await setDoc(
      doc(db, 'attendance', `${employee.shift}_${employee.id}_${year}_${month}_${day}`),
      {
        empId: employee.id,
        day,
        month,
        year,
        status: 'P',
        shift: employee.shift,
        markedAt: serverTimestamp(),
        markedViaKiosk: true,
      },
      { merge: true }
    );

    setMarkedIds(prev => new Set([...prev, employee.id]));
    setLastMarked(employee.name);
    setTimeout(() => setLastMarked(null), 2500);
  };

  const remaining = employees.filter(e => !markedIds.has(e.id));
  const markedCount = markedIds.size;

  return (
    <div className="kiosk-container">
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

      {step === 'mark_attendance' && (
        <div className="kiosk-card kiosk-card-wide">
          <div className="kiosk-attendance-header">
            <div>
              <h2 className="kiosk-title">Marcar Presença — Turno {shift}</h2>
              <p className="kiosk-subtitle">
                ✅ {markedCount} marcados &nbsp;·&nbsp; ⏳ {remaining.length} pendentes
              </p>
            </div>
          </div>

          {lastMarked && (
            <div className="kiosk-toast">
              ✅ {lastMarked} — Presença registrada!
            </div>
          )}

          {remaining.length === 0 ? (
            <div className="kiosk-all-done">
              <div className="kiosk-done-emoji">🎉</div>
              <h3>Todos presentes!</h3>
              <p>Todas as presenças do Turno {shift} foram registradas.</p>
            </div>
          ) : (
            <ul className="kiosk-employee-list">
              {remaining.map(emp => (
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
        </div>
      )}
    </div>
  );
};

export default AttendanceKiosk;
