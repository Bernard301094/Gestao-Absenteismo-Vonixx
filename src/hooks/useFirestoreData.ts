import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection, doc, setDoc, onSnapshot, getDocs, writeBatch,
  query, where, serverTimestamp, updateDoc, deleteDoc, deleteField, limit
} from 'firebase/firestore';
import { exportStyledExcel } from '../utils/exportExcel';
import toast from '../utils/toast';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  Status, ShiftType, Employee, GlobalEmployee,
  AttendanceRecord, NotesRecord, LockedDaysRecord, Vacation
} from '../types';
import { isWorkDay } from '../utils/dateUtils';

// ─── Date helpers ─────────────────────────────────────────────────────────────

const normalizeDate = (dateVal: any): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'object' && 'toDate' in dateVal) return dateVal.toDate().toISOString().split('T')[0];

  if (typeof dateVal === 'string') {
    const val = dateVal.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
      const iso = val.substring(0, 10);
      const parts = iso.split('-');
      let y = parts[0], m = parts[1], d = parts[2];
      if (parseInt(m) > 12 && parseInt(d) <= 12) return `${y}-${d}-${m}`;
      return iso;
    }
    if (val.includes('/')) {
      const parts = val.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          let m = parts[1], d = parts[2];
          if (parseInt(m) > 12 && parseInt(d) <= 12) { const t = m; m = d; d = t; }
          return `${parts[0]}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        let day  = parts[0].padStart(2, '0');
        let mon  = parts[1].padStart(2, '0');
        if (parseInt(mon) > 12 && parseInt(day) <= 12) { const t = mon; mon = day; day = t; }
        const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        return `${year}-${mon}-${day}`;
      }
    }
    if (/^\d{1,2}-\d{1,2}-\d{2,4}/.test(val)) {
      const parts = val.split('-');
      let day  = parts[0].padStart(2, '0');
      let mon  = parts[1].padStart(2, '0');
      if (parseInt(mon) > 12 && parseInt(day) <= 12) { const t = mon; mon = day; day = t; }
      const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
      return `${year}-${mon}-${day}`;
    }
    return val;
  }
  return '';
};

function deriveReturnDate(endDateISO: string): string {
  if (!endDateISO || endDateISO.length < 10) return '';
  const [y, m, d] = endDateISO.split('-').map(Number);
  if (!y || !m || !d) return '';

  let ret = new Date(y, m - 1, d + 1);
  if (!isWorkDay(ret.getDate(), ret.getMonth(), ret.getFullYear())) {
    ret = new Date(ret.getFullYear(), ret.getMonth(), ret.getDate() + 1);
  }
  const ry = ret.getFullYear();
  const rm = String(ret.getMonth() + 1).padStart(2, '0');
  const rd = String(ret.getDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
}

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export function wasActiveOnDay(emp: { dismissed?: boolean; dismissalDate?: string; admissionDate?: string }, day: number, month: number, year: number): boolean {
  const target = new Date(year, month, day);
  if (emp.admissionDate) {
    const [ay, am, ad] = emp.admissionDate.split('-').map(Number);
    const admission = new Date(ay, am - 1, ad);
    if (target < admission) return false;
  }
  if (!emp.dismissed) return true;
  if (!emp.dismissalDate) return false;
  const [dy, dm, dd] = emp.dismissalDate.split('-').map(Number);
  const dismissal = new Date(dy, dm - 1, dd);
  return target < dismissal;
}

function isEmployeeOnVacation(empId: string, dateStr: string, vacations: Vacation[]): boolean {
  return vacations.some(v => v.employeeId === empId && v.status === 'taken' && v.startDate && v.endDate && dateStr >= v.startDate && dateStr <= v.endDate);
}

interface UseFirestoreDataParams {
  user: any; currentShift: ShiftType | null; isSupervision: boolean; isAdminUser: boolean;
  supervisionShiftFilter: 'A' | 'B' | 'C' | 'D'; currentMonth: number; currentYear: number;
  selectedDay: number | 'all'; VALID_WORK_DAYS: number[];
}

export function useFirestoreData({
  user, currentShift, isSupervision, isAdminUser, supervisionShiftFilter,
  currentMonth, currentYear, selectedDay, VALID_WORK_DAYS,
}: UseFirestoreDataParams) {

  const [rawEmployees, setRawEmployees] = useState<Employee[]>([]);
  const [globalEmployees, setGlobalEmployees] = useState<GlobalEmployee[]>([]);
  const [globalAttendance, setGlobalAttendance] = useState<AttendanceRecord>({});
  const [globalCompletions, setGlobalCompletions] = useState<any[]>([]);
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<Employee | null>(null);

  const [attendance, setAttendance] = useState<AttendanceRecord>({});
  const [notes, setNotes] = useState<NotesRecord>({});
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [pendingAttendance, setPendingAttendance] = useState<AttendanceRecord>({});
  const [pendingNotes, setPendingNotes] = useState<NotesRecord>({});
  const [isSaving, setIsSaving] = useState(false);
  const [lockedDays, setLockedDays] = useState<LockedDaysRecord>({});

  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState('');
  const [newEmployeeAdmissionDate, setNewEmployeeAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const allModeRefDay = useMemo(() => {
    const now = new Date();
    const isCurrentMonth = now.getMonth() === currentMonth && now.getFullYear() === currentYear;
    return isCurrentMonth ? now.getDate() : new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentMonth, currentYear]);

  const employees = useMemo(() => {
    const refDay = selectedDay === 'all' ? allModeRefDay : (selectedDay as number);
    return rawEmployees.filter(emp => wasActiveOnDay(emp, refDay, currentMonth, currentYear));
  }, [rawEmployees, selectedDay, currentMonth, currentYear, allModeRefDay]);

  useEffect(() => {
    if (!isSupervision) return;
    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const emps: GlobalEmployee[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        const rawDate = data.dataAdmissao || data.admissionDate || data.data_admissao;
        emps.push({ id: d.id, ...data, admissionDate: normalizeDate(rawDate), dismissalDate: normalizeDate(data.dismissalDate || data.dataDemissao || '') } as GlobalEmployee);
      });
      setGlobalEmployees(emps); setRawEmployees(emps);
    });

    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const att: AttendanceRecord = {};
      snapshot.forEach(d => {
        const data = d.data();
        if (data.month === currentMonth && data.year === currentYear) {
          if (!att[data.empId]) att[data.empId] = {};
          att[data.empId][data.day] = data.status;
        }
      });
      setGlobalAttendance(att);
    });

    const unsubCompletions = onSnapshot(collection(db, 'completions'), (snapshot) => {
      const comps: any[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        if (data.month === currentMonth && data.year === currentYear) comps.push(data);
      });
      setGlobalCompletions(comps);
    });

    const unsubVacations = onSnapshot(collection(db, 'vacations'), (snapshot) => {
      const vacs: Vacation[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        const endDate = normalizeDate(data.vacationEnd || data.endDate || '');
        vacs.push({
          id: d.id, employeeId: data.employeeId || d.id,
          startDate: normalizeDate(data.vacationStart || data.dataInicioFerias || data.startDate || ''),
          endDate, returnDate: deriveReturnDate(endDate), returnConfirmed: data.returnConfirmed === true,
          status: (data.vacationStatus?.toLowerCase().includes('agendada') || data.status === 'scheduled') ? 'scheduled' : 'taken',
          diasDireito: data.diasDireito ?? 30, vendeuFerias: data.vendeuFerias ?? false, diasVendidos: data.diasVendidos ?? 0, isHistorical: data.isHistorical ?? false,
        } as Vacation);
      });
      setVacations(vacs);
    });

    return () => { unsubEmployees(); unsubAttendance(); unsubCompletions(); unsubVacations(); };
  }, [isSupervision, currentMonth, currentYear]);

  useEffect(() => {
    let active = true;
    let unsubEmployees: (() => void) | null = null; let unsubAttendance: (() => void) | null = null;
    let unsubCompletions: (() => void) | null = null; let unsubVacations: (() => void) | null = null;

    if (!user || !currentShift) {
      setRawEmployees([]); setAttendance({}); setNotes({}); setVacations([]); setDataLoading(false); return;
    }

    setDataLoading(true); setConnectionError(null);

    const setupListeners = async () => {
      if (!active) return;
      const shiftToQuery = isSupervision ? supervisionShiftFilter : currentShift;
      if (!shiftToQuery) { setDataLoading(false); return; }

      try {
        unsubEmployees = onSnapshot(
          query(collection(db, 'employees'), where('shift', '==', shiftToQuery)),
          (snapshot) => {
            if (!active) return;
            const emps: Employee[] = []; const embeddedVacs: Vacation[] = [];
            snapshot.forEach(d => {
              const data = d.data();
              emps.push({
                id: d.id, name: data.name, admissionDate: normalizeDate(data.dataAdmissao || data.data_admissao || data.admissionDate),
                role: data.role || data.cargo || '', shift: data.shift || '', dismissed: data.dismissed || false, dismissalDate: normalizeDate(data.dismissalDate || data.dataDemissao || ''),
              });

              const vacStart = normalizeDate(data.vacationStart || data.dataInicioFerias);
              const vacEnd   = normalizeDate(data.vacationEnd || data.dataFimFerias);
              if (vacStart) {
                let status: 'scheduled' | 'taken' = 'taken';
                if (data.vacationStatus?.toLowerCase().includes('agendada') || data.status === 'scheduled') status = 'scheduled';
                else if (vacStart > new Date().toISOString().split('T')[0]) status = 'scheduled';
                
                embeddedVacs.push({
                  id: `vac_${d.id}`, employeeId: d.id, startDate: vacStart, endDate: vacEnd, returnDate: deriveReturnDate(vacEnd), returnConfirmed: data.returnConfirmed === true,
                  status, diasDireito: data.diasDireito ?? 30, vendeuFerias: data.vendeuFerias ?? false, diasVendidos: data.diasVendidos ?? 0, isHistorical: data.isHistorical ?? false,
                });
              }
            });
            setRawEmployees(emps.sort((a, b) => a.name.localeCompare(b.name)));
            setVacations(prev => [...embeddedVacs, ...prev.filter(v => !v.id.startsWith('vac_'))]);
            setDataLoading(false);
          },
          (error) => { if (active) { setDataLoading(false); setConnectionError(error.message); } }
        );

        unsubVacations = onSnapshot(collection(db, 'vacations'), (snapshot) => {
          if (!active) return;
          const collVacs: Vacation[] = [];
          snapshot.forEach(d => {
            const data = d.data();
            const vacStart = normalizeDate(data.vacationStart || data.dataInicioFerias || data.startDate);
            const vacEnd   = normalizeDate(data.vacationEnd || data.endDate);
            let status: 'scheduled' | 'taken' = 'taken';
            if (data.vacationStatus?.toLowerCase().includes('agendada') || data.status === 'scheduled') status = 'scheduled';
            else if (vacStart > new Date().toISOString().split('T')[0]) status = 'scheduled';
            
            collVacs.push({
              id: d.id, employeeId: data.employeeId || d.id, startDate: vacStart, endDate: vacEnd, returnDate: deriveReturnDate(vacEnd), returnConfirmed: data.returnConfirmed === true,
              status, diasDireito: data.diasDireito ?? 30, vendeuFerias: data.vendeuFerias ?? false, diasVendidos: data.diasVendidos ?? 0, isHistorical: data.isHistorical ?? false,
            } as Vacation);
          });
          setVacations(prev => [...prev.filter(v => v.id.startsWith('vac_')), ...collVacs]);
        });

        unsubAttendance = onSnapshot(
          query(collection(db, 'attendance'), where('shift', '==', shiftToQuery)),
          (snapshot) => {
            if (!active) return;
            const newAttendance: AttendanceRecord = {}; const newNotes: NotesRecord = {};
            snapshot.forEach(d => {
              const { empId, day, status, note, month, year } = d.data();
              if (month === currentMonth && year === currentYear) {
                if (!newAttendance[empId]) newAttendance[empId] = {}; newAttendance[empId][day] = status as Status;
                if (note) { if (!newNotes[empId]) newNotes[empId] = {}; newNotes[empId][day] = note; }
              }
            });
            setAttendance(newAttendance); setNotes(newNotes); setDataLoading(false);
          },
          (error) => { if (active) { setDataLoading(false); setConnectionError(error.message); } }
        );

        unsubCompletions = onSnapshot(
          query(collection(db, 'completions'), where('shift', '==', shiftToQuery)),
          (snapshot) => {
            if (!active) return;
            const newLockedDays: LockedDaysRecord = {};
            snapshot.forEach(d => { const data = d.data(); if (data.month === currentMonth && data.year === currentYear) newLockedDays[data.day] = true; });
            setLockedDays(newLockedDays);
          }
        );
      } catch (err: any) { if (active) { setDataLoading(false); setConnectionError(err.message); } }
    };

    setupListeners();

    const handleOnline = () => { setConnectionError(null); setRetryCount(prev => prev + 1); };
    window.addEventListener('online', handleOnline);

    return () => {
      active = false; window.removeEventListener('online', handleOnline);
      if (unsubEmployees) unsubEmployees(); if (unsubAttendance) unsubAttendance();
      if (unsubCompletions) unsubCompletions(); if (unsubVacations) unsubVacations();
    };
  }, [user, currentShift, isSupervision, supervisionShiftFilter, isAdminUser, currentMonth, currentYear, retryCount]);

  const handleRetry = () => setRetryCount(prev => prev + 1);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newEmployeeName.trim()) return;
    const shiftToAssign = isSupervision ? supervisionShiftFilter : currentShift;
    if (!shiftToAssign || shiftToAssign === 'ALL') return;

    const shiftEmployees = rawEmployees.filter(emp => emp.shift === shiftToAssign);
    const maxId = shiftEmployees.reduce((max, emp) => {
      const numericPart = parseInt(emp.id.replace(/^[A-D]/, ''));
      return isNaN(numericPart) ? max : Math.max(max, numericPart);
    }, 0);
    const newId = `${shiftToAssign}${(maxId + 1).toString().padStart(4, '0')}`;

    try {
      await setDoc(doc(db, 'employees', newId), {
        name: newEmployeeName.toUpperCase(), createdAt: serverTimestamp(), shift: shiftToAssign,
        admissionDate: newEmployeeAdmissionDate, dataAdmissao: newEmployeeAdmissionDate,
        data_admissao: newEmployeeAdmissionDate, role: newEmployeeRole.trim(), cargo: newEmployeeRole.trim(),
      });
      setNewEmployeeName(''); setNewEmployeeRole(''); setNewEmployeeAdmissionDate(new Date().toISOString().split('T')[0]); setShowAddEmployeeModal(false);
    } catch (error) { handleFirestoreError(error, OperationType.WRITE, 'employees'); }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingEmployee?.name.trim()) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const updatePayload: Record<string, any> = {
        name: editingEmployee.name.trim().toUpperCase(), admissionDate: editingEmployee.admissionDate,
        dataAdmissao: editingEmployee.admissionDate, data_admissao: editingEmployee.admissionDate,
        role: editingEmployee.role || '', cargo: editingEmployee.role || '', dismissed: editingEmployee.dismissed || false,
      };

      if (editingEmployee.dismissed) {
        updatePayload.dismissalDate = editingEmployee.dismissalDate || today;
        updatePayload.dataDemissao  = editingEmployee.dismissalDate || today;
      } else { updatePayload.dismissalDate = deleteField(); updatePayload.dataDemissao = deleteField(); }

      await updateDoc(doc(db, 'employees', editingEmployee.id), updatePayload);
      setShowEditEmployeeModal(false); setEditingEmployee(null); toast.success('Funcionário atualizado com sucesso!');
    } catch (error) { handleFirestoreError(error, OperationType.UPDATE, 'employees'); }
  };

  const handleUpdateVacation = async (id: string, vacation: Partial<Vacation>) => {
    try {
      const safeReturnDate = vacation.endDate ? deriveReturnDate(vacation.endDate) : vacation.returnDate;
      if (id.startsWith('vac_')) {
        const empId = id.replace('vac_', '');
        const rawPayload: Record<string, any> = {
          vacationStart: vacation.startDate, dataInicioFerias: vacation.startDate,
          vacationEnd: vacation.endDate, dataFimFerias: vacation.endDate, returnDate: safeReturnDate,
          diasDireito: vacation.diasDireito, vendeuFerias: vacation.vendeuFerias, diasVendidos: vacation.diasVendidos,
          status: vacation.status, vacationStatus: vacation.status === 'taken' ? 'Concluída' : 'Agendada',
        };
        if (vacation.returnConfirmed !== undefined) rawPayload.returnConfirmed = vacation.returnConfirmed;
        await updateDoc(doc(db, 'employees', empId), stripUndefined(rawPayload));
      } else {
        const { id: _id, ...rest } = vacation as any;
        await updateDoc(doc(db, 'vacations', id), stripUndefined({ ...rest, returnDate: safeReturnDate, updatedAt: serverTimestamp() }));
      }
      toast.success('Férias atualizadas com sucesso!');
    } catch (error) { handleFirestoreError(error, OperationType.UPDATE, 'vacations'); }
  };

  const updateEmployeeData = async (id: string, data: any) => {
    try { await updateDoc(doc(db, 'employees', id), { ...data, ...(data.admissionDate ? { dataAdmissao: data.admissionDate } : {}) }); } 
    catch (error) { handleFirestoreError(error, OperationType.UPDATE, 'employees'); }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este funcionário?')) return;
    try { await deleteDoc(doc(db, 'employees', id)); } catch (error) { handleFirestoreError(error, OperationType.DELETE, 'employees'); }
  };

  // MAGIA APLICADA: Si es un día viejo que ya fue guardado, asume 'P'. Si es un día nuevo, queda en blanco.
  const getStatusForDay = useCallback((empId: string, day: number): Status | undefined => {
    const s = pendingAttendance[empId]?.[day] ?? attendance[empId]?.[day];
    if (s) return s;
    if (lockedDays[day]) return 'P';
    return undefined;
  }, [pendingAttendance, attendance, lockedDays]);
  
  const setStatus = (empId: string, day: number, status: Status) => { setPendingAttendance(prev => ({ ...prev, [empId]: { ...(prev[empId] || {}), [day]: status } })); };
  const setNote = (empId: string, day: number, note: string) => { setPendingNotes(prev => ({ ...prev, [empId]: { ...(prev[empId] || {}), [day]: note } })); };

  const handleMarkAllPresent = () => {
    const day = selectedDay === 'all' ? new Date().getDate() : (selectedDay as number);
    if (lockedDays[day]) return;

    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${mm}-${dd}`;
    const targetDate = new Date(currentYear, currentMonth, day);
    const batch: Record<string, Status> = {};

    employees.forEach(emp => {
      if (emp.admissionDate) {
        const [y, m, d] = emp.admissionDate.split('-').map(Number);
        if (targetDate < new Date(y, m - 1, d)) return;
      }
      const currentS = pendingAttendance[emp.id]?.[day] ?? attendance[emp.id]?.[day];

      if (isEmployeeOnVacation(emp.id, dateStr, vacations)) {
        if (currentS !== 'Fe') batch[emp.id] = 'Fe';
        return;
      }

      if (currentS === 'A' || currentS === 'F') return;
      if (currentS !== 'P') batch[emp.id] = 'P';
    });

    if (Object.keys(batch).length === 0) return;
    setPendingAttendance(prev => {
      const next = { ...prev };
      Object.entries(batch).forEach(([empId, status]) => { next[empId] = { ...(next[empId] || {}), [day]: status }; });
      return next;
    });
  };

  const handleSave = async () => {
    const effectiveShift = isSupervision ? supervisionShiftFilter : (currentShift ?? (isAdminUser ? supervisionShiftFilter : null));
    if (!user || !effectiveShift || isSaving) { if (!effectiveShift && !isSaving) toast.error('Turno inválido.'); return; }
    setIsSaving(true);
    try {
      const batch = writeBatch(db); let hasChanges = false;
      Object.entries(pendingAttendance).forEach(([empId, days]) => {
        const emp = rawEmployees.find(e => e.id === empId);
        Object.entries(days).forEach(([dayStr, status]) => {
          const day = parseInt(dayStr);
          if (emp?.admissionDate) { const [y, m, d] = emp.admissionDate.split('-').map(Number); if (new Date(currentYear, currentMonth, day) < new Date(y, m - 1, d)) return; }
          batch.set(doc(db, 'attendance', `${effectiveShift}_${empId}_${currentYear}_${currentMonth}_${day}`), { empId, day, month: currentMonth, year: currentYear, status, note: pendingNotes[empId]?.[day] ?? notes[empId]?.[day] ?? '', updatedAt: serverTimestamp(), shift: effectiveShift }, { merge: true });
          hasChanges = true;
        });
      });

      Object.entries(pendingNotes).forEach(([empId, days]) => {
        const emp = rawEmployees.find(e => e.id === empId);
        Object.entries(days).forEach(([dayStr, note]) => {
          const day = parseInt(dayStr);
          if (pendingAttendance[empId]?.[day]) return;
          if (emp?.admissionDate) { const [y, m, d] = emp.admissionDate.split('-').map(Number); if (new Date(currentYear, currentMonth, day) < new Date(y, m - 1, d)) return; }
          batch.set(doc(db, 'attendance', `${effectiveShift}_${empId}_${currentYear}_${currentMonth}_${day}`), { empId, day, month: currentMonth, year: currentYear, status: attendance[empId]?.[day] ?? 'P', note, updatedAt: serverTimestamp(), shift: effectiveShift }, { merge: true });
          hasChanges = true;
        });
      });

      if (hasChanges) {
        await batch.commit();
        const savedDays = new Set<number>();
        Object.values(pendingAttendance).forEach(days => Object.keys(days).forEach(d => savedDays.add(parseInt(d))));
        Object.values(pendingNotes).forEach(days => Object.keys(days).forEach(d => savedDays.add(parseInt(d))));

        const completionBatch = writeBatch(db);
        savedDays.forEach(dayNum => { completionBatch.set(doc(db, 'completions', `${effectiveShift}_${currentYear}_${currentMonth}_${dayNum}`), { shift: effectiveShift, day: dayNum, month: currentMonth, year: currentYear, completedAt: serverTimestamp(), completedBy: user.email, isLocked: true }, { merge: true }); });
        await completionBatch.commit();

        setLockedDays(prev => { const next = { ...prev }; savedDays.forEach(d => { next[d] = true; }); return next; });
        setPendingAttendance({}); setPendingNotes({}); toast.success('Alterações salvas com sucesso!');
      } else { toast.info('Nenhuma alteração para salvar.'); }
    } catch (error) { toast.error('Erro ao salvar.'); handleFirestoreError(error, OperationType.WRITE, 'attendance'); }
    finally { setIsSaving(false); }
  };

  const handleExportExcel = () => { const shiftLabel = isSupervision ? supervisionShiftFilter : (currentShift ?? ''); exportStyledExcel({ employees, attendance, validWorkDays: VALID_WORK_DAYS, currentMonth, currentYear, shiftLabel }); };
  const handleAddVacation = async (vacation: Omit<Vacation, 'id'>) => {
    const safeVacation = { ...vacation, returnDate: vacation.endDate ? deriveReturnDate(vacation.endDate) : vacation.returnDate };
    try { await setDoc(doc(collection(db, 'vacations')), { ...safeVacation, createdAt: serverTimestamp() }); toast.success('Férias agendadas com sucesso!'); } catch (error) { handleFirestoreError(error, OperationType.WRITE, 'vacations'); }
  };
  const handleDeleteVacation = async (id: string) => {
    if (!window.confirm('Deseja cancelar este agendamento de férias?')) return;
    try { await deleteDoc(doc(db, 'vacations', id)); toast.success('Férias canceladas.'); } catch (error) { handleFirestoreError(error, OperationType.DELETE, 'vacations'); }
  };

  return {
    employees, rawEmployees, globalEmployees, globalAttendance, globalCompletions, attendance, notes, vacations, dataLoading,
    pendingAttendance, pendingNotes, isSaving, lockedDays, setLockedDays, selectedEmployeeDetail, setSelectedEmployeeDetail,
    newEmployeeName, setNewEmployeeName, newEmployeeRole, setNewEmployeeRole, newEmployeeAdmissionDate, setNewEmployeeAdmissionDate,
    showAddEmployeeModal, setShowAddEmployeeModal, showEditEmployeeModal, setShowEditEmployeeModal, editingEmployee, setEditingEmployee,
    handleRetry, connectionError,
    handleAddEmployee, handleUpdateEmployee, handleDeleteEmployee, updateEmployeeData, handleMarkAllPresent, handleSave,
    setStatus, setNote, getStatusForDay, handleExportExcel, handleAddVacation, handleDeleteVacation, handleUpdateVacation,
  };
}