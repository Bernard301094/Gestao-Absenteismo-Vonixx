import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  Status,
  AttendanceRecord,
  NotesRecord,
  LockedDaysRecord,
  Vacation,
  Employee,
} from '../types';

function normalizeDate(value: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useFirestoreData(currentMonth: number, currentYear: number) {
  const [attendance, setAttendance] = useState<AttendanceRecord>({});
  const [notes, setNotes] = useState<NotesRecord>({});
  const [lockedDays, setLockedDays] = useState<LockedDaysRecord>({});
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const loadedEmployees: Employee[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Employee, 'id'>),
      }));
      setEmployees(loadedEmployees);
    });

    const unsubAttendance = onSnapshot(
      query(collection(db, 'attendance'), where('month', '==', currentMonth), where('year', '==', currentYear)),
      (snapshot) => {
        const att: AttendanceRecord = {};
        const nts: NotesRecord = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (!data.empId || typeof data.day !== 'number') return;
          if (!att[data.empId]) att[data.empId] = {};
          if (!nts[data.empId]) nts[data.empId] = {};
          att[data.empId][data.day] = data.status;
          nts[data.empId][data.day] = data.note || '';
        });
        setAttendance(att);
        setNotes(nts);
      },
    );

    const unsubLocked = onSnapshot(
      query(collection(db, 'lockedDays'), where('month', '==', currentMonth), where('year', '==', currentYear)),
      (snapshot) => {
        const locked: LockedDaysRecord = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (typeof data.day === 'number') locked[data.day] = !!data.locked;
        });
        setLockedDays(locked);
      },
    );

    const unsubVacations = onSnapshot(collection(db, 'vacations'), (snapshot) => {
      const collVacs: Vacation[] = [];
      const todayISO = new Date().toISOString().split('T')[0];

      snapshot.docs.forEach((d) => {
        const data = d.data();
        const vacStart = data.vacationStart || data.dataInicioFerias || data.startDate || '';
        const vacEnd = data.vacationEnd || data.endDate || '';
        if (!vacStart) return;

        let status: 'scheduled' | 'taken' = 'taken';
        if (data.vacationStatus?.toLowerCase().includes('agendada') || data.status === 'scheduled') {
          status = 'scheduled';
        } else if (vacEnd && vacEnd >= todayISO) {
          status = 'scheduled';
        }

        collVacs.push({
          id: d.id,
          employeeId: data.employeeId || data.empId || '',
          startDate: normalizeDate(vacStart),
          endDate: normalizeDate(vacEnd),
          returnDate: normalizeDate(data.returnDate || ''),
          status,
          diasDireito: data.diasDireito ?? 30,
          vendeuFerias: data.vendeuFerias ?? false,
          diasVendidos: data.diasVendidos ?? 0,
          isHistorical: !!data.isHistorical,
          historicalReason: data.historicalReason,
        } as Vacation);
      });

      setVacations(collVacs);
      setLoading(false);
    });

    return () => {
      unsubEmployees();
      unsubAttendance();
      unsubLocked();
      unsubVacations();
    };
  }, [currentMonth, currentYear]);

  const handleAddVacation = async (vacation: Omit<Vacation, 'id'>) => {
    const ref = doc(collection(db, 'vacations'));
    await setDoc(ref, {
      employeeId: vacation.employeeId,
      startDate: vacation.startDate,
      endDate: vacation.endDate,
      returnDate: vacation.returnDate || '',
      status: vacation.status,
      vacationStatus: vacation.status === 'taken' ? 'Concluída' : 'Agendada',
      vacationStart: vacation.startDate,
      vacationEnd: vacation.endDate,
      dataInicioFerias: vacation.startDate,
      dataFimFerias: vacation.endDate,
      diasDireito: vacation.diasDireito ?? 30,
      vendeuFerias: vacation.vendeuFerias ?? false,
      diasVendidos: vacation.diasVendidos ?? 0,
      isHistorical: vacation.isHistorical ?? false,
      historicalReason: vacation.historicalReason ?? null,
      createdAt: new Date().toISOString(),
    });
  };

  const handleUpdateVacation = async (id: string, vacation: Partial<Vacation>) => {
    const ref = doc(db, 'vacations', id);
    await updateDoc(ref, {
      ...(vacation.startDate ? {
        startDate: vacation.startDate,
        vacationStart: vacation.startDate,
        dataInicioFerias: vacation.startDate,
      } : {}),
      ...(vacation.endDate ? {
        endDate: vacation.endDate,
        vacationEnd: vacation.endDate,
        dataFimFerias: vacation.endDate,
      } : {}),
      ...(vacation.returnDate !== undefined ? { returnDate: vacation.returnDate || '' } : {}),
      ...(vacation.status ? {
        status: vacation.status,
        vacationStatus: vacation.status === 'taken' ? 'Concluída' : 'Agendada',
      } : {}),
      ...(vacation.diasDireito !== undefined ? { diasDireito: vacation.diasDireito } : {}),
      ...(vacation.vendeuFerias !== undefined ? { vendeuFerias: vacation.vendeuFerias } : {}),
      ...(vacation.diasVendidos !== undefined ? { diasVendidos: vacation.diasVendidos } : {}),
      ...(vacation.isHistorical !== undefined ? { isHistorical: vacation.isHistorical } : {}),
      ...(vacation.historicalReason !== undefined ? { historicalReason: vacation.historicalReason ?? null } : {}),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteVacation = async (id: string) => {
    await deleteDoc(doc(db, 'vacations', id));
  };

  const updateEmployeeData = async (id: string, data: Partial<Employee>) => {
    await updateDoc(doc(db, 'employees', id), data as Record<string, unknown>);
  };

  const setStatus = async (empId: string, day: number, status: Status) => {
    const docId = `${empId}_${currentYear}_${currentMonth}_${day}`;
    await setDoc(doc(db, 'attendance', docId), {
      empId,
      day,
      month: currentMonth,
      year: currentYear,
      status,
      note: notes[empId]?.[day] || '',
    }, { merge: true });
  };

  const setNote = async (empId: string, day: number, note: string) => {
    const docId = `${empId}_${currentYear}_${currentMonth}_${day}`;
    await setDoc(doc(db, 'attendance', docId), {
      empId,
      day,
      month: currentMonth,
      year: currentYear,
      status: attendance[empId]?.[day] || 'P',
      note,
    }, { merge: true });
  };

  const toggleDayLock = async (day: number, locked: boolean) => {
    const docId = `${currentYear}_${currentMonth}_${day}`;
    await setDoc(doc(db, 'lockedDays', docId), {
      day,
      month: currentMonth,
      year: currentYear,
      locked,
    }, { merge: true });
  };

  const addEmployee = async (employee: Employee) => {
    const ref = employee.id ? doc(db, 'employees', employee.id) : doc(collection(db, 'employees'));
    await setDoc(ref, employee, { merge: true });
  };

  const updateEmployee = async (id: string, data: Partial<Employee>) => {
    await updateDoc(doc(db, 'employees', id), data as Record<string, unknown>);
  };

  const deleteEmployee = async (id: string) => {
    await deleteDoc(doc(db, 'employees', id));
    const vacationDocs = await getDocs(query(collection(db, 'vacations'), where('employeeId', '==', id)));
    await Promise.all(vacationDocs.docs.map((d) => deleteDoc(doc(db, 'vacations', d.id))));
  };

  return {
    attendance,
    notes,
    lockedDays,
    vacations,
    employees,
    loading,
    setStatus,
    setNote,
    toggleDayLock,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    handleAddVacation,
    handleUpdateVacation,
    handleDeleteVacation,
    updateEmployeeData,
  };
}
