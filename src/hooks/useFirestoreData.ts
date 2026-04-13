import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, setDoc, onSnapshot, getDocs, writeBatch,
  query, where, serverTimestamp, updateDoc, deleteDoc, limit
} from 'firebase/firestore';
import { exportStyledExcel } from '../utils/exportExcel';
import toast from '../utils/toast';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  Status, ShiftType, Employee, GlobalEmployee,
  AttendanceRecord, NotesRecord, LockedDaysRecord
} from '../types';

// ─── Dados Iniciais (Bootstrap) ───────────────────────────────────────────────
const EMPLOYEES_BOOTSTRAP: Employee[] = [
  { id: '1', name: 'PEDRO DAVI LIMA CAVALCANTE' },
  { id: '2', name: 'MARCILIO DA CONCEIÇÃO' },
  { id: '3', name: 'CARLOS ALBERTO VIEIRA DA SILVA' },
  { id: '4', name: 'KAUA JADSON SOUSA RABELO' },
  { id: '5', name: 'LUCAS UCHOA ALVES DE SOUSA' },
  { id: '6', name: 'THIAGO DOS SANTOS SOUZA' },
  { id: '7', name: 'CARLOS WILLAME ALEXANDRE LIMA' },
  { id: '8', name: 'ADRIEL FREITAS LOPES' },
  { id: '9', name: 'FRANCISCO VINICIUS DA SILVA MENEZES' },
  { id: '10', name: 'JONATHAN MOURA MODESTO' },
  { id: '11', name: 'KAUA SILVA FERREIRA' },
  { id: '12', name: 'PEDRO RUAN DAMASCENO DE PAULA' },
  { id: '13', name: 'SAMUEL RABELO LIONEL' },
  { id: '14', name: 'ANTONIO WESSLEY ALVES COSTA' },
  { id: '15', name: 'CÁSSIO HENRIQUE SANTOS' },
  { id: '16', name: 'JANDERSON DE AZEVEDO SANTIAGO' },
  { id: '17', name: 'MARIA VANESSA LIMA EVANGELISTA' },
  { id: '18', name: 'ANTONIO BRENDON DE SOUSA ROCHA' },
  { id: '19', name: 'DAVYSSON DA SILVA MENDONCA' },
  { id: '20', name: 'ENDERSON NUNES DE OLIVEIRA' },
  { id: '21', name: 'GLEIDSON RODRIGUES DO VALE' },
  { id: '22', name: 'JEREMIAS ROMUALDO FERREIRA PINTO' },
  { id: '23', name: 'JOAO IRANDILMO PEREIRA DE SOUSA FILHO' },
  { id: '24', name: 'JOAO VICTOR DE SOUSA BERNARDO' },
  { id: '25', name: 'LEIDIANE DOS SANTOS FIGUEIREDO' },
  { id: '26', name: 'LEONARDO GOMES DE OLIVEIRA' },
  { id: '27', name: 'LUCIANO DA SILVA CARDOSO FILHO' },
  { id: '28', name: 'RYAN DO NASCIMENTO COSTA' },
  { id: '29', name: 'UESLEI DE SOUSA LIMA' },
  { id: '30', name: 'WANDERLEIA TEIXEIRA LIMA' },
  { id: '31', name: 'PEDRO AUAN DANTAS BORGES' },
  { id: '32', name: 'LUIZ HENRIQUE' },
  { id: '33', name: 'FRANCISCO FABRICIO DA SILVA LIMA' },
  { id: '34', name: 'IURY KAEFF FERREIRA BRAÚNA' },
  { id: '35', name: 'RYNALDO ALVES DE ARAÚJO' },
  { id: '36', name: 'BRUNO ROBERTI DE SOUZA' },
  { id: '37', name: 'BRENO OLIVEIRA DA COSTA' },
  { id: '38', name: 'IZADORA DE OLIVEIRA GONÇALVES' },
  { id: '39', name: 'JOAQUIM FRANCISCO DOS SANTOS RODRIGUES' },
  { id: '40', name: 'ABNER JONNAS DA SILVA' },
  { id: '41', name: 'ALEX PEREIRA SILVA' },
  { id: '42', name: 'ANDERSON RODRIGUES DA SILVA' },
  { id: '43', name: 'ANDRE LUIZ OLIVEIRA DA SILVA' },
  { id: '44', name: 'ANTONIA ANAPAULA CORREIA FREIRE' },
  { id: '45', name: 'ANTONIO REVESTON DEODORO DE FRANCA' },
  { id: '46', name: 'ANTONIO ZITO ALVES DA SILVA' },
  { id: '47', name: 'BERNARD EDUARDO DE FREITAS CASTILLO' },
  { id: '48', name: 'DAVI DA SILVA NOBRE' },
  { id: '49', name: 'DEUVID PEREIRA LIMA' },
  { id: '50', name: 'DIANA ABREU DA SILVA' },
  { id: '51', name: 'ERIVANDA DE LIMA VIEIRA' },
  { id: '52', name: 'EUGENIA FIRMINO DO NASCIMENTO' },
  { id: '53', name: 'EUNICE SEBASTIAO RODRIGUES' },
  { id: '54', name: 'EVANDERSON DE SOUSA DUTRA' },
  { id: '55', name: 'EVANDRO MARQUES ALMEIDA' },
  { id: '56', name: 'FERNANDO SANTOS CARVALHO' },
  { id: '57', name: 'FLAVIO CORREIA ALMEIDA' },
  { id: '58', name: 'FRANCINEIDE DA SILVA GOMES' },
  { id: '59', name: 'FRANCISCO DE ASSIS MENDONCA BARBOSA' },
  { id: '60', name: 'FRANCISCO FELIPE COSME' },
  { id: '61', name: 'FRANCISCO HERNANDES DE SOUZA MOREIRA FILHO' },
  { id: '62', name: 'FRANCISCO JEFFERSON PEREIRA' },
  { id: '63', name: 'FRANCISCO MAURICIO LIMA FILHO' },
  { id: '64', name: 'GABRIEL DE OLIVEIRA SILVA' },
  { id: '65', name: 'GABRIELA LOURDES DE OLIVEIRA NASCIMENTO' },
  { id: '66', name: 'JAMILLE DOMINGOS DA SILVA' },
  { id: '67', name: 'JOSE JOAQUIM MARQUES TEIXEIRA' },
  { id: '68', name: 'JOSE WILLAME TOME SOARES' },
  { id: '69', name: 'KAIO VINICIUS DE SOUSA CARDOSO' },
  { id: '70', name: 'LAZARO TEONAS ALVES BEZERRA' },
  { id: '71', name: 'PHABLO MATOS DE ARAUJO' },
  { id: '72', name: 'ROSIMEIRE FERREIRA SILVA' },
  { id: '73', name: 'RYAN DE SOUZA MARQUES' },
  { id: '74', name: 'SAMARA BRAGA DE MOURA' },
  { id: '75', name: 'SAMUEL GOMES DO CARMO' },
  { id: '76', name: 'SERGIO RICHARD MOREIRA DE FREITAS' },
  { id: '77', name: 'WALEF DOS SANTOS NUNES' },
  { id: '78', name: 'YURI MENDONCA QUIRINO' },
  { id: '79', name: 'JOSIMAR SILVA DANTAS' },
  { id: '80', name: 'DEYVISON FERREIRA' },
  { id: '81', name: 'MARINALVA DOS SANTOS' },
  { id: '82', name: 'SAMUEL BESERRA' },
  { id: '83', name: 'IAN PABLO' },
  { id: '84', name: 'LUTYGARD DA SILVA MACIEL' },
  { id: '85', name: 'NATANAEL VALENCIO DA SILVA' },
  { id: '86', name: 'STAEL BERNARDO UCHOA DE SOUSA' },
  { id: '87', name: 'BRUNO MIRANDA DE OLIVEIRA' },
  { id: '88', name: 'ANTONIO JOSE SANTOS GONÇALVES' },
  { id: '89', name: 'MARIA NAYARA LEITE DA SILVA' },
  { id: '90', name: 'RAIMUNDA ALVES PEREIRA' },
  { id: '91', name: 'VITÓRIA REGIA MOURA' },
  { id: '92', name: 'VANESSA GOMES DE LIMA' },
  { id: '93', name: 'CARLOS ALEXANDRE DE LIMA RODRIGUES' },
  { id: '94', name: 'JEANE PEREIRA DE OLIVEIRA CASTRO' },
  { id: '95', name: 'JOSÉ MILTON DE OLIVEIRA SOUZA' },
  { id: '96', name: 'ÍTALO RODIGUES DOS SANTOS' },
  { id: '97', name: 'GERMANO ALVES LOPES DUARTE' },
  { id: '98', name: 'MARCOS ANTONIO DOS SANTOS PIRES' },
  { id: '99', name: 'ISRAEL DA SILVA MENEZES' },
  { id: '100', name: 'ALEXANDRE SOUSA' },
];

const INITIAL_ATTENDANCE_BOOTSTRAP: Record<string, Record<number, Status>> = {
  '1': { 3: 'F', 5: 'F', 7: 'F', 9: 'F', 11: 'F', 13: 'F' },
  '2': { 5: 'F', 7: 'F', 9: 'F', 11: 'F', 13: 'F' },
  '3': { 3: 'F', 5: 'F', 11: 'F', 13: 'F' },
  '4': { 3: 'F', 5: 'F', 11: 'F', 13: 'F' },
  '5': { 3: 'F', 5: 'F', 9: 'F', 11: 'F' },
  '6': { 3: 'F', 5: 'F', 11: 'F', 13: 'F' },
  '7': { 3: 'F', 5: 'F', 11: 'F' },
  '8': { 3: 'F', 9: 'F', 13: 'F' },
  '9': { 11: 'F', 13: 'F' },
  '10': { 3: 'F', 11: 'F' },
  '11': { 11: 'F', 13: 'F' },
  '12': { 5: 'F', 13: 'F' },
  '13': { 3: 'F', 13: 'F' },
  '14': { 5: 'F', 13: 'F' },
  '15': { 7: 'F', 9: 'F' },
  '16': { 7: 'F', 11: 'F' },
  '17': { 5: 'F', 13: 'F' },
  '18': { 11: 'F' },
  '19': { 3: 'F', 7: 'Fe', 9: 'Fe', 11: 'Fe', 13: 'Fe' },
  '20': { 5: 'F' },
  '21': { 13: 'F' },
  '22': { 11: 'F' },
  '23': { 13: 'F' },
  '24': { 13: 'F' },
  '25': { 3: 'F' },
  '26': { 13: 'F' },
  '27': { 11: 'F' },
  '28': { 13: 'F' },
  '29': { 13: 'F' },
  '30': { 11: 'F' },
  '31': { 3: 'F' },
  '32': { 13: 'F' },
  '33': { 9: 'F' },
  '34': { 13: 'F' },
  '35': { 3: 'F' },
  '36': { 9: 'F' },
  '37': { 13: 'F' },
  '38': { 13: 'F' },
  '39': { 3: 'F' },
  '45': { 7: 'Fe', 9: 'Fe', 11: 'Fe', 13: 'Fe' },
  '58': { 3: 'A', 5: 'A', 7: 'A', 9: 'A', 11: 'A', 13: 'A' },
  '63': { 7: 'Fe', 9: 'Fe', 11: 'Fe', 13: 'Fe' },
  '70': { 3: 'Fe' },
  '86': { 3: 'A', 5: 'A', 7: 'A', 9: 'A', 11: 'A', 13: 'A' },
};

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
  const [dataLoading, setDataLoading] = useState(true);

  const [pendingAttendance, setPendingAttendance] = useState<AttendanceRecord>({});
  const [pendingNotes, setPendingNotes] = useState<NotesRecord>({});
  const [isSaving, setIsSaving] = useState(false);
  const [lockedDays, setLockedDays] = useState<LockedDaysRecord>({});

  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // ─── Listeners Globais (Supervisão) ────────────────────────────────────────
  useEffect(() => {
    if (!isSupervision) return;

    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const emps: GlobalEmployee[] = [];
      snapshot.forEach(d => emps.push({ id: d.id, ...d.data() } as GlobalEmployee));
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

    return () => {
      unsubEmployees();
      unsubAttendance();
      unsubCompletions();
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

    const bootstrapData = async () => {
      if (currentShift !== 'A' && !isAdminUser) return;
      if (window.sessionStorage.getItem('bootstrapped')) return;

      try {
        const empSnapshot = await getDocs(query(collection(db, 'employees'), limit(1)));
        if (!active) return;

        if (empSnapshot.empty) {
          const batch = writeBatch(db);
          EMPLOYEES_BOOTSTRAP.forEach(emp => {
            batch.set(doc(db, 'employees', emp.id), {
              name: emp.name,
              createdAt: new Date(),
              shift: 'A',
            });
          });
          Object.entries(INITIAL_ATTENDANCE_BOOTSTRAP).forEach(([empId, days]) => {
            Object.entries(days).forEach(([dayStr, status]) => {
              const day = parseInt(dayStr);
              const recordId = `${empId}_2026_3_${day}`;
              batch.set(doc(db, 'attendance', recordId), {
                empId, day, month: 3, year: 2026,
                status, note: '', updatedAt: new Date(), shift: 'A',
              });
            });
          });
          await batch.commit();
        }
        window.sessionStorage.setItem('bootstrapped', 'true');
      } catch (e) {
        console.error('Bootstrap error:', e);
      }
    };

    const setupListeners = async () => {
      await bootstrapData();
      if (!active) return;

      const shiftToQuery = isSupervision ? supervisionShiftFilter : currentShift;
      if (!shiftToQuery) { setDataLoading(false); return; }

      unsubEmployees = onSnapshot(
        query(collection(db, 'employees'), where('shift', '==', shiftToQuery)),
        (snapshot) => {
          if (!active) return;
          const emps: Employee[] = [];
          snapshot.forEach(d => emps.push({ id: d.id, name: d.data().name }));
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
      });
      setNewEmployeeName('');
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

  return {
    // Estado
    employees, globalEmployees, globalAttendance, globalCompletions,
    attendance, notes, dataLoading,
    pendingAttendance, pendingNotes, isSaving,
    lockedDays, setLockedDays,
    selectedEmployeeDetail, setSelectedEmployeeDetail,
    newEmployeeName, setNewEmployeeName,
    showAddEmployeeModal, setShowAddEmployeeModal,
    showEditEmployeeModal, setShowEditEmployeeModal,
    editingEmployee, setEditingEmployee,
    // Acciones
    handleAddEmployee, handleUpdateEmployee, handleDeleteEmployee,
    handleMarkAllPresent, handleSave,
    setStatus, setNote, getStatusForDay,
    handleExportExcel,
  };
}
