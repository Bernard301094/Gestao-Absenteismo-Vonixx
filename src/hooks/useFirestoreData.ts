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

// ─── Parámetros del Hook ──────────────────────────────────────────────────────
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

  const [pendingAttendance, setPendingAttendance] = useState<AttendanceRecord>({});
  const [pendingNotes, setPendingNotes] = useState<NotesRecord>({});
  const [isSaving, setIsSaving] = useState(false);
  const [lockedDays, setLockedDays] = useState<LockedDaysRecord>({});

  const [newEmployeeName, setNewEmployeeName] = useState('');
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
        // Try all possible field names for admission date
        let rawDate = data.dataAdmissao || data.admissionDate || data.data_admissao;
        let admissionDate = '';

        if (rawDate) {
          if (typeof rawDate === 'object' && 'toDate' in rawDate) {
            // Handle Firestore Timestamp
            admissionDate = rawDate.toDate().toISOString().split('T')[0];
          } else if (typeof rawDate === 'string') {
            if (rawDate.includes('/')) {
              // Handle DD/MM/YYYY format
              const parts = rawDate.split('/');
              if (parts.length === 3) {
                // Check if it's DD/MM/YYYY or MM/DD/YYYY (assuming DD/MM/YYYY based on "06/05/2024")
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                admissionDate = `${year}-${month}-${day}`;
              }
            } else {
              // Assume YYYY-MM-DD
              admissionDate = rawDate;
            }
          }
        }
        
        emps.push({ id: d.id, ...data, admissionDate } as GlobalEmployee);
      });
      setGlobalEmployees(emps);
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
        
        // Normalize vacation dates from various possible formats
        const normalizeDate = (dateVal: any) => {
          if (!dateVal) return '';
          if (typeof dateVal === 'object' && 'toDate' in dateVal) return dateVal.toDate().toISOString().split('T')[0];
          if (typeof dateVal === 'string') {
            if (dateVal.includes('/')) {
              const parts = dateVal.split('/');
              if (parts.length === 3) {
                // Assuming DD/MM/YYYY or MM/DD/YYYY. Based on returnDate "10/31/2026", it's MM/DD/YYYY
                // But admissionDate "06/05/2024" looks like DD/MM/YYYY.
                // Let's handle both by checking if the first part > 12
                let day, month, year;
                if (parseInt(parts[0]) > 12) {
                  day = parts[0].padStart(2, '0');
                  month = parts[1].padStart(2, '0');
                } else if (parseInt(parts[1]) > 12) {
                  month = parts[0].padStart(2, '0');
                  day = parts[1].padStart(2, '0');
                } else {
                  // Ambiguous, default to DD/MM/YYYY for Brazil
                  day = parts[0].padStart(2, '0');
                  month = parts[1].padStart(2, '0');
                }
                year = parts[2];
                return `${year}-${month}-${day}`;
              }
            }
            return dateVal;
          }
          return '';
        };

        vacs.push({
          id: d.id,
          employeeId: data.employeeId || d.id, // Fallback if employeeId is missing
          startDate: normalizeDate(data.vacationStart || data.dataInicioFerias || data.startDate || ''),
          endDate: normalizeDate(data.vacationEnd || data.endDate || ''),
          status: (data.vacationStatus?.toLowerCase().includes('agendada') || data.status === 'scheduled') ? 'scheduled' : 'taken'
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

    const unsub = onSnapshot(collection(db, 'completions'), (snapshot) => {
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
    });

    return () => unsub();
  }, [user, currentShift]);

  // ─── Listener Principal (Turno) ────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    let unsubEmployees: (() => void) | null = null;
    let unsubAttendance: (() => void) | null = null;
    let unsubCompletions: (() => void) | null = null;

    if (!user || !currentShift) {
      setEmployees([]);
      setAttendance({});
      setNotes({});
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    const setupListeners = async () => {
      if (!active) return;

      const shiftToQuery = isSupervision ? supervisionShiftFilter : currentShift;
      if (!shiftToQuery) { setDataLoading(false); return; }

      unsubEmployees = onSnapshot(
        query(collection(db, 'employees'), where('shift', '==', shiftToQuery)),
        (snapshot) => {
          if (!active) return;
          const emps: Employee[] = [];
          snapshot.forEach(d => {
            const data = d.data();
            // Try all possible field names for admission date
            let rawDate = data.dataAdmissao || data.admissionDate || data.data_admissao;
            let admissionDate = '';

            if (rawDate) {
              if (typeof rawDate === 'object' && 'toDate' in rawDate) {
                // Handle Firestore Timestamp
                admissionDate = rawDate.toDate().toISOString().split('T')[0];
              } else if (typeof rawDate === 'string') {
                if (rawDate.includes('/')) {
                  // Handle DD/MM/YYYY format
                  const parts = rawDate.split('/');
                  if (parts.length === 3) {
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    const year = parts[2];
                    admissionDate = `${year}-${month}-${day}`;
                  }
                } else {
                  // Assume YYYY-MM-DD
                  admissionDate = rawDate;
                }
              }
            }
            
            emps.push({ 
              id: d.id, 
              name: data.name, 
              admissionDate: admissionDate 
            });
          });
          setEmployees(emps.sort((a, b) => a.name.localeCompare(b.name)));
          setDataLoading(false);
        },
        (error) => { if (active) handleFirestoreError(error, OperationType.GET, 'employees'); }
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
        (error) => { if (active) handleFirestoreError(error, OperationType.GET, 'attendance'); }
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
        (error) => { if (active) handleFirestoreError(error, OperationType.GET, 'completions'); }
      );
    };

    setupListeners();

    return () => {
      active = false;
      if (unsubEmployees) unsubEmployees();
      if (unsubAttendance) unsubAttendance();
      if (unsubCompletions) unsubCompletions();
    };
  }, [user, currentShift, isSupervision, supervisionShiftFilter, isAdminUser, currentMonth, currentYear]);

  // ─── CRUD Funcionários ─────────────────────────────────────────────────────
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName.trim()) return;
    const maxId = Math.max(...employees.map(emp => parseInt(emp.id)), 0);
    const newId = (maxId + 1).toString();
    const shiftToAssign = isSupervision ? supervisionShiftFilter : currentShift;
    if (!shiftToAssign || shiftToAssign === 'ALL') return;
    try {
      await setDoc(doc(db, 'employees', newId), {
        name: newEmployeeName.toUpperCase(),
        createdAt: serverTimestamp(),
        shift: shiftToAssign,
        admissionDate: newEmployeeAdmissionDate,
      });
      setNewEmployeeName('');
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
      });
      setShowEditEmployeeModal(false);
      setEditingEmployee(null);
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
    const batch: Record<string, Status> = {};
    employees.forEach(emp => {
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
    if (!user || !currentShift || currentShift === 'ALL' || isSaving) return;
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      let hasChanges = false;

      Object.entries(pendingAttendance).forEach(([empId, days]) => {
        Object.entries(days).forEach(([dayStr, status]) => {
          const day = parseInt(dayStr);
          batch.set(
            doc(db, 'attendance', `${empId}_${currentYear}_${currentMonth}_${day}`),
            {
              empId, day, month: currentMonth, year: currentYear, status,
              note: pendingNotes[empId]?.[day] ?? notes[empId]?.[day] ?? '',
              updatedAt: serverTimestamp(), shift: currentShift,
            },
            { merge: true }
          );
          hasChanges = true;
        });
      });

      Object.entries(pendingNotes).forEach(([empId, days]) => {
        Object.entries(days).forEach(([dayStr, note]) => {
          const day = parseInt(dayStr);
          if (pendingAttendance[empId]?.[day]) return;
          batch.set(
            doc(db, 'attendance', `${empId}_${currentYear}_${currentMonth}_${day}`),
            {
              empId, day, month: currentMonth, year: currentYear,
              status: attendance[empId]?.[day] ?? 'P',
              note, updatedAt: serverTimestamp(), shift: currentShift,
            },
            { merge: true }
          );
          hasChanges = true;
        });
      });

      if (hasChanges) {
        await batch.commit();
        const completionId = `${currentShift}_${currentYear}_${currentMonth}_${selectedDay}`;
        await setDoc(
          doc(db, 'completions', completionId),
          {
            shift: currentShift, day: selectedDay,
            month: currentMonth, year: currentYear,
            completedAt: serverTimestamp(), completedBy: user.email, isLocked: true,
          },
          { merge: true }
        );
        setLockedDays(prev => ({ ...prev, [selectedDay as number]: true }));
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

  // ─── Export Excel Estilizado ───────────────────────────────────────────────
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
      await setDoc(newVacationRef, vacation);
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
    newEmployeeAdmissionDate, setNewEmployeeAdmissionDate,
    showAddEmployeeModal, setShowAddEmployeeModal,
    showEditEmployeeModal, setShowEditEmployeeModal,
    editingEmployee, setEditingEmployee,
    // Acciones
    handleAddEmployee, handleUpdateEmployee, handleDeleteEmployee,
    handleMarkAllPresent, handleSave,
    setStatus, setNote, getStatusForDay,
    handleExportExcel,
    handleAddVacation, handleDeleteVacation,
  };
}
