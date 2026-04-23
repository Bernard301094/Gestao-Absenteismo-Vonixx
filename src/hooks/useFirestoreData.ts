import React, { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, setDoc, onSnapshot, getDocs, writeBatch,
  query, where, serverTimestamp, updateDoc, deleteDoc, limit
} from 'firebase/firestore';
import { exportStyledExcel } from '../utils/exportExcel';
import toast from '../utils/toast';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  Status, ShiftType, Employee, GlobalEmployee,
  AttendanceRecord, NotesRecord, LockedDaysRecord, Vacation
} from '../types';

// ─── Helper para Normalizar Datas ─────────────────────────────────────────────
const normalizeDate = (dateVal: any): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'object' && 'toDate' in dateVal) {
    return dateVal.toDate().toISOString().split('T')[0];
  }
  if (typeof dateVal === 'string') {
    if (dateVal.includes('T')) return dateVal.split('T')[0];
    if (dateVal.includes('/')) {
      const parts = dateVal.split('/');
      if (parts.length === 3) {
        let day, month;
        const p0 = parseInt(parts[0]);
        const p1 = parseInt(parts[1]);
        if (p0 > 12) {
          day = parts[0].padStart(2, '0');
          month = parts[1].padStart(2, '0');
        } else if (p1 > 12) {
          month = parts[0].padStart(2, '0');
          day = parts[1].padStart(2, '0');
        } else {
          day = parts[0].padStart(2, '0');
          month = parts[1].padStart(2, '0');
        }
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        return `${year}-${month}-${day}`;
      }
    }
    return dateVal;
  }
  return '';
};

// ─── Parámetros do Hook ───────────────────────────────────────────────────────
interface UseFirestoreDataParams {
  user: any;
  currentShift: ShiftType | null;
  isSupervision: boolean;
  isAdminUser: boolean;
  supervisionShiftFilter: 'A' | 'B' | 'C' | 'D';
  currentMonth: number;
  currentYear: number;
  selectedDay: number | 'all';
  VALID_WORK_DAYS: number[];
}

export function useFirestoreData({
  user,
  currentShift,
  isSupervision,
  isAdminUser,
  supervisionShiftFilter,
  currentMonth,
  currentYear,
  selectedDay,
  VALID_WORK_DAYS,
}: UseFirestoreDataParams) {

  // ─── Estado ────────────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
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

  // ─── Listeners Globais (Supervisão) ────────────────────────────────────────
  useEffect(() => {
    if (!isSupervision) return;

    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const emps: GlobalEmployee[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        const rawDate = data.dataAdmissao || data.admissionDate || data.data_admissao;
        const admissionDate = normalizeDate(rawDate);
        emps.push({ id: d.id, ...data, admissionDate } as GlobalEmployee);
      });
      setGlobalEmployees(emps);
      setEmployees(emps.filter(emp => !emp.dismissed));
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
        vacs.push({
          id: d.id,
          employeeId: data.employeeId || d.id,
          startDate: normalizeDate(data.vacationStart || data.dataInicioFerias || data.startDate || ''),
          endDate: normalizeDate(data.vacationEnd || data.endDate || ''),
          returnDate: normalizeDate(data.returnDate || ''),
          status: (data.vacationStatus?.toLowerCase().includes('agendada') || data.status === 'scheduled') ? 'scheduled' : 'taken',
          diasDireito: data.diasDireito ?? 30,
          vendeuFerias: data.vendeuFerias ?? false,
          diasVendidos: data.diasVendidos ?? 0,
          isHistorical: data.isHistorical ?? false,
          historicalReason: data.historicalReason ?? undefined,
        } as Vacation);
      });
      setVacations(vacs);
    });

    return () => {
      unsubEmployees();
      unsubAttendance();
      unsubCompletions();
      unsubVacations();
    };
  }, [isSupervision, currentMonth, currentYear]);

  // ─── Notificações Push ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const startTime = Date.now();

    const unsub = onSnapshot(
      collection(db, 'completions'),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const completedAt = data.completedAt?.toMillis();
            if (completedAt && completedAt > startTime && data.shift !== currentShift) {
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification('Turno Finalizado', {
                    body: `O Turno ${data.shift} finalizou a lista do dia ${data.day}.`,
                    icon: 'https://cdn-icons-png.flaticon.com/512/3589/3589030.png',
                  });
                } catch (e) {
                  console.log('Notification error:', e);
                }
              }
            }
          }
        });
      },
      (error) => { console.error('Push notifications listener error:', error); }
    );

    return () => unsub();
  }, [user, currentShift]);

  // ─── Listener Principal (Turno) ────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    let unsubEmployees: (() => void) | null = null;
    let unsubAttendance: (() => void) | null = null;
    let unsubCompletions: (() => void) | null = null;
    let unsubVacations: (() => void) | null = null;

    if (!user || !currentShift) {
      setEmployees([]);
      setAttendance({});
      setNotes({});
      setVacations([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setConnectionError(null);

    const setupListeners = async () => {
      if (!active) return;

      const shiftToQuery = isSupervision ? supervisionShiftFilter : currentShift;
      if (!shiftToQuery) { setDataLoading(false); return; }

      try {
        unsubEmployees = onSnapshot(
          query(collection(db, 'employees'), where('shift', '==', shiftToQuery)),
          (snapshot) => {
            if (!active) return;
            const emps: Employee[] = [];
            const embeddedVacs: Vacation[] = [];

            snapshot.forEach(d => {
              const data = d.data();
              const rawDate = data.dataAdmissao || data.data_admissao || data.admissionDate;
              const admissionDate = normalizeDate(rawDate);

              emps.push({
                id: d.id,
                name: data.name,
                admissionDate,
                role: data.role || data.cargo || '',
                shift: data.shift || '',
                dismissed: data.dismissed || false, // <-- LÍNEA AGREGADA: Captura si está despedido
              });

              const vacStart = data.vacationStart || data.dataInicioFerias;
              const vacEnd = data.vacationEnd || data.dataFimFerias || '';
              const todayISO = new Date().toISOString().split('T')[0];

              if (vacStart) {
                let status: 'scheduled' | 'taken' = 'taken';
                if (data.vacationStatus?.toLowerCase().includes('agendada') || data.status === 'scheduled') {
                  status = 'scheduled';
                } else if (vacEnd && vacEnd >= todayISO) {
                  status = 'scheduled';
                }
                embeddedVacs.push({
                  id: `vac_${d.id}`,
                  employeeId: d.id,
                  startDate: normalizeDate(vacStart),
                  endDate: normalizeDate(vacEnd),
                  returnDate: normalizeDate(data.returnDate || ''),
                  status,
                  diasDireito: data.diasDireito ?? 30,
                  vendeuFerias: data.vendeuFerias ?? false,
                  diasVendidos: data.diasVendidos ?? 0,
                  isHistorical: data.isHistorical ?? false,
                  historicalReason: data.historicalReason ?? undefined,
                });
              }
            });

            // <-- LÍNEA MODIFICADA: Filtra a los empleados que están en `dismissed: true` para que no se muestren en el turno
            setEmployees(emps.filter(emp => !emp.dismissed).sort((a, b) => a.name.localeCompare(b.name)));
            setVacations(prev => {
              const collectionVacs = prev.filter(v => !v.id.startsWith('vac_'));
              return [...embeddedVacs, ...collectionVacs];
            });
            setDataLoading(false);
          },
          (error) => {
            if (active) {
              setDataLoading(false);
              setConnectionError(error.message);
              console.error('Employees listener error:', error);
            }
          }
        );

        unsubVacations = onSnapshot(
          collection(db, 'vacations'),
          (snapshot) => {
            if (!active) return;
            const collVacs: Vacation[] = [];
            snapshot.forEach(d => {
              const data = d.data();
              const vacStart = data.vacationStart || data.dataInicioFerias || data.startDate || '';
              const vacEnd = data.vacationEnd || data.endDate || '';
              const todayISO = new Date().toISOString().split('T')[0];

              let status: 'scheduled' | 'taken' = 'taken';
              if (data.vacationStatus?.toLowerCase().includes('agendada') || data.status === 'scheduled') {
                status = 'scheduled';
              } else if (vacEnd && vacEnd >= todayISO) {
                status = 'scheduled';
              }

              collVacs.push({
                id: d.id,
                employeeId: data.employeeId || d.id,
                startDate: normalizeDate(vacStart),
                endDate: normalizeDate(vacEnd),
                returnDate: normalizeDate(data.returnDate || ''),
                status,
                diasDireito: data.diasDireito ?? 30,
                vendeuFerias: data.vendeuFerias ?? false,
                diasVendidos: data.diasVendidos ?? 0,
                isHistorical: data.isHistorical ?? false,
                historicalReason: data.historicalReason ?? undefined,
              } as Vacation);
            });

            setVacations(prev => {
              const embeddedVacs = prev.filter(v => v.id.startsWith('vac_'));
              return [...embeddedVacs, ...collVacs];
            });
          },
          (error) => {
            if (active) console.error('Vacations listener error:', error);
          }
        );

        unsubAttendance = onSnapshot(
          query(collection(db, 'attendance'), where('shift', '==', shiftToQuery)),
          (snapshot) => {
            if (!active) return;
            const newAttendance: AttendanceRecord = {};
            const newNotes: NotesRecord = {};
            snapshot.forEach(d => {
              const data = d.data();
              const { empId, day, status, note, month, year } = data;
              if (month === currentMonth && year === currentYear) {
                if (!newAttendance[empId]) newAttendance[empId] = {};
                newAttendance[empId][day] = status as Status;
                if (note) {
                  if (!newNotes[empId]) newNotes[empId] = {};
                  newNotes[empId][day] = note;
                }
              }
            });
            setAttendance(newAttendance);
            setNotes(newNotes);
            setDataLoading(false);
          },
          (error) => {
            if (active) {
              setDataLoading(false);
              setConnectionError(error.message);
              console.error('Attendance listener error:', error);
            }
          }
        );

        unsubCompletions = onSnapshot(
          query(collection(db, 'completions'), where('shift', '==', shiftToQuery)),
          (snapshot) => {
            if (!active) return;
            const newLockedDays: LockedDaysRecord = {};
            snapshot.forEach(d => {
              const data = d.data();
              if (data.month === currentMonth && data.year === currentYear) {
                newLockedDays[data.day] = true;
              }
            });
            setLockedDays(newLockedDays);
          },
          (error) => {
            if (active) console.error('Completions listener error:', error);
          }
        );

      } catch (err: any) {
        if (active) {
          setDataLoading(false);
          setConnectionError(err.message);
        }
      }
    };

    setupListeners();

    const handleOnline = () => {
      setConnectionError(null);
      setRetryCount(prev => prev + 1);
    };
    window.addEventListener('online', handleOnline);

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      if (unsubEmployees) unsubEmployees();
      if (unsubAttendance) unsubAttendance();
      if (unsubCompletions) unsubCompletions();
      if (unsubVacations) unsubVacations();
    };
  }, [user, currentShift, isSupervision, supervisionShiftFilter, isAdminUser, currentMonth, currentYear, retryCount]);

  const handleRetry = () => setRetryCount(prev => prev + 1);

  // ─── CRUD Funcionários ─────────────────────────────────────────────────────
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName.trim()) return;
    const shiftToAssign = isSupervision ? supervisionShiftFilter : currentShift;
    if (!shiftToAssign || shiftToAssign === 'ALL') return;

    const shiftEmployees = employees.filter(emp => emp.shift === shiftToAssign);
    const maxId = shiftEmployees.reduce((max, emp) => {
      const numericPart = parseInt(emp.id.replace(/^[A-D]/, ''));
      return isNaN(numericPart) ? max : Math.max(max, numericPart);
    }, 0);
    const newId = `${shiftToAssign}${(maxId + 1).toString().padStart(4, '0')}`;

    try {
      await setDoc(doc(db, 'employees', newId), {
        name: newEmployeeName.toUpperCase(),
        createdAt: serverTimestamp(),
        shift: shiftToAssign,
        admissionDate: newEmployeeAdmissionDate,
        dataAdmissao: newEmployeeAdmissionDate,
        data_admissao: newEmployeeAdmissionDate,
        role: newEmployeeRole.trim(),
        cargo: newEmployeeRole.trim(),
      });
      setNewEmployeeName('');
      setNewEmployeeRole('');
      setNewEmployeeAdmissionDate(new Date().toISOString().split('T')[0]);
      setShowAddEmployeeModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'employees');
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee?.name.trim()) return;
    try {
      await updateDoc(doc(db, 'employees', editingEmployee.id), {
        name: editingEmployee.name.trim().toUpperCase(),
        admissionDate: editingEmployee.admissionDate,
        dataAdmissao: editingEmployee.admissionDate,
        data_admissao: editingEmployee.admissionDate,
        role: editingEmployee.role || '',
        cargo: editingEmployee.role || '',
        dismissed: editingEmployee.dismissed || false, // <-- LÍNEA AGREGADA: Guarda el estado de demitido
      });
      setShowEditEmployeeModal(false);
      setEditingEmployee(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'employees');
    }
  };

  const handleUpdateVacation = async (id: string, vacation: Partial<Vacation>) => {
    try {
      if (id.startsWith('vac_')) {
        const empId = id.replace('vac_', '');
        await updateDoc(doc(db, 'employees', empId), {
          vacationStart: vacation.startDate,
          dataInicioFerias: vacation.startDate,
          vacationEnd: vacation.endDate,
          dataFimFerias: vacation.endDate,
          returnDate: vacation.returnDate,
          diasDireito: vacation.diasDireito,
          vendeuFerias: vacation.vendeuFerias,
          diasVendidos: vacation.diasVendidos,
          status: vacation.status,
          vacationStatus: vacation.status === 'taken' ? 'Concluída' : 'Agendada',
        });
      } else {
        await updateDoc(doc(db, 'vacations', id), {
          ...vacation,
          updatedAt: serverTimestamp(),
        });
      }
      toast.success('Férias atualizadas com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'vacations');
    }
  };

  const updateEmployeeData = async (id: string, data: any) => {
    try {
      await updateDoc(doc(db, 'employees', id), {
        ...data,
        ...(data.admissionDate ? { dataAdmissao: data.admissionDate } : {}),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'employees');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este funcionário?')) return;
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'employees');
    }
  };

  // ─── Asistência ────────────────────────────────────────────────────────────
  const getStatusForDay = useCallback(
    (empId: string, day: number): Status =>
      pendingAttendance[empId]?.[day] ?? attendance[empId]?.[day] ?? 'P',
    [pendingAttendance, attendance]
  );

  const setStatus = (empId: string, day: number, status: Status) => {
    setPendingAttendance(prev => ({
      ...prev,
      [empId]: { ...(prev[empId] || {}), [day]: status },
    }));
  };

  const setNote = (empId: string, day: number, note: string) => {
    setPendingNotes(prev => ({
      ...prev,
      [empId]: { ...(prev[empId] || {}), [day]: note },
    }));
  };

  const handleMarkAllPresent = () => {
    const day = selectedDay === 'all' ? new Date().getDate() : (selectedDay as number);
    if (lockedDays[day]) return;
    const targetDate = new Date(currentYear, currentMonth, day);
    const batch: Record<string, Status> = {};
    employees.forEach(emp => {
      if (emp.admissionDate) {
        const [y, m, d] = emp.admissionDate.split('-').map(Number);
        const admDate = new Date(y, m - 1, d);
        if (targetDate < admDate) return;
      }
      const s = pendingAttendance[emp.id]?.[day] ?? attendance[emp.id]?.[day] ?? 'P';
      if (s !== 'P') batch[emp.id] = 'P';
    });
    if (Object.keys(batch).length === 0) return;
    setPendingAttendance(prev => {
      const next = { ...prev };
      Object.entries(batch).forEach(([empId, status]) => {
        next[empId] = { ...(next[empId] || {}), [day]: status };
      });
      return next;
    });
  };

  const handleSave = async () => {
    const effectiveShift =
      isSupervision
        ? supervisionShiftFilter
        : (currentShift ?? (isAdminUser ? supervisionShiftFilter : null));

    if (!user || !effectiveShift || isSaving) {
      if (!effectiveShift && !isSaving) {
        toast.error('Turno inválido. Selecione um turno antes de salvar.');
      }
      return;
    }

    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      let hasChanges = false;

      Object.entries(pendingAttendance).forEach(([empId, days]) => {
        const emp = employees.find(e => e.id === empId);
        Object.entries(days).forEach(([dayStr, status]) => {
          const day = parseInt(dayStr);
          if (emp?.admissionDate) {
            const [y, m, d] = emp.admissionDate.split('-').map(Number);
            const admDate = new Date(y, m - 1, d);
            const targetDate = new Date(currentYear, currentMonth, day);
            if (targetDate < admDate) return;
          }
          batch.set(
            doc(db, 'attendance', `${effectiveShift}_${empId}_${currentYear}_${currentMonth}_${day}`),
            {
              empId, day, month: currentMonth, year: currentYear, status,
              note: pendingNotes[empId]?.[day] ?? notes[empId]?.[day] ?? '',
              updatedAt: serverTimestamp(), shift: effectiveShift,
            },
            { merge: true }
          );
          hasChanges = true;
        });
      });

      Object.entries(pendingNotes).forEach(([empId, days]) => {
        const emp = employees.find(e => e.id === empId);
        Object.entries(days).forEach(([dayStr, note]) => {
          const day = parseInt(dayStr);
          if (pendingAttendance[empId]?.[day]) return;
          if (emp?.admissionDate) {
            const [y, m, d] = emp.admissionDate.split('-').map(Number);
            const admDate = new Date(y, m - 1, d);
            const targetDate = new Date(currentYear, currentMonth, day);
            if (targetDate < admDate) return;
          }
          batch.set(
            doc(db, 'attendance', `${effectiveShift}_${empId}_${currentYear}_${currentMonth}_${day}`),
            {
              empId, day, month: currentMonth, year: currentYear,
              status: attendance[empId]?.[day] ?? 'P',
              note, updatedAt: serverTimestamp(), shift: effectiveShift,
            },
            { merge: true }
          );
          hasChanges = true;
        });
      });

      if (hasChanges) {
        await batch.commit();

        const savedDays = new Set<number>();
        Object.values(pendingAttendance).forEach(days =>
          Object.keys(days).forEach(d => savedDays.add(parseInt(d)))
        );
        Object.values(pendingNotes).forEach(days =>
          Object.keys(days).forEach(d => savedDays.add(parseInt(d)))
        );

        const completionBatch = writeBatch(db);
        savedDays.forEach(dayNum => {
          const completionId = `${effectiveShift}_${currentYear}_${currentMonth}_${dayNum}`;
          completionBatch.set(
            doc(db, 'completions', completionId),
            {
              shift: effectiveShift,
              day: dayNum,
              month: currentMonth,
              year: currentYear,
              completedAt: serverTimestamp(),
              completedBy: user.email,
              isLocked: true,
            },
            { merge: true }
          );
        });
        await completionBatch.commit();

        setLockedDays(prev => {
          const next = { ...prev };
          savedDays.forEach(d => { next[d] = true; });
          return next;
        });
        setPendingAttendance({});
        setPendingNotes({});
        toast.success('Alterações salvas com sucesso!');
      } else {
        toast.info('Nenhuma alteração para salvar.');
      }
    } catch (error) {
      toast.error('Erro ao salvar. Verifique sua conexão e tente novamente.');
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Export Excel ──────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const shiftLabel = isSupervision ? supervisionShiftFilter : (currentShift ?? '');
    exportStyledExcel({
      employees,
      attendance,
      validWorkDays: VALID_WORK_DAYS,
      currentMonth,
      currentYear,
      shiftLabel,
    });
  };

  // ─── Vacaciones ────────────────────────────────────────────────────────────
  const handleAddVacation = async (vacation: Omit<Vacation, 'id'>) => {
    try {
      const newVacationRef = doc(collection(db, 'vacations'));
      await setDoc(newVacationRef, {
        ...vacation,
        createdAt: serverTimestamp(),
      });
      toast.success('Férias agendadas com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'vacations');
    }
  };

  const handleDeleteVacation = async (id: string) => {
    if (!window.confirm('Deseja cancelar este agendamento de férias?')) return;
    try {
      await deleteDoc(doc(db, 'vacations', id));
      toast.success('Férias canceladas.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'vacations');
    }
  };

  return {
    // Estado
    employees, globalEmployees, globalAttendance, globalCompletions,
    attendance, notes, vacations, dataLoading,
    pendingAttendance, pendingNotes, isSaving,
    lockedDays, setLockedDays,
    selectedEmployeeDetail, setSelectedEmployeeDetail,
    newEmployeeName, setNewEmployeeName,
    newEmployeeRole, setNewEmployeeRole,
    newEmployeeAdmissionDate, setNewEmployeeAdmissionDate,
    showAddEmployeeModal, setShowAddEmployeeModal,
    showEditEmployeeModal, setShowEditEmployeeModal,
    editingEmployee, setEditingEmployee,
    handleRetry,
    connectionError,
    // Acciones
    handleAddEmployee, handleUpdateEmployee, handleDeleteEmployee, updateEmployeeData,
    handleMarkAllPresent, handleSave,
    setStatus, setNote, getStatusForDay,
    handleExportExcel,
    handleAddVacation, handleDeleteVacation, handleUpdateVacation,
  };
}
