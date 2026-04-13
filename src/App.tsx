import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Users, 
  CalendarX, 
  Activity,
  TrendingUp,
  AlertCircle,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  CheckCircle2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  UserPlus,
  X,
  LogOut
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import { auth, db, loginWithEmail, logout, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, onSnapshot, getDocs, writeBatch, query, where, serverTimestamp } from 'firebase/firestore';

// --- DADOS INICIAIS ---
const EMPLOYEES = [
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

// Faltas iniciais baseadas no PDF para não começar vazio
type Status = 'P' | 'F' | 'Fe' | 'A';

const INITIAL_ATTENDANCE: Record<string, Record<number, Status>> = {
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

const CURRENT_DAY = 13; // Dia atual baseado no contexto

// Lógica 12x36: 13/04/2026 é dia de trabalho (ímpar).
// Portanto, todos os dias ímpares são dias de trabalho e pares são folga.
const isWorkDay = (day: number) => day % 2 !== 0;
const isValidDay = (day: number) => day <= CURRENT_DAY && day !== 1; // Nova regra: apenas dias até o dia atual e ignora dia 1

const VALID_WORK_DAYS = Array.from({ length: CURRENT_DAY }, (_, i) => i + 1).filter(d => isWorkDay(d) && isValidDay(d));

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'registro'>('dashboard');
  const [selectedDay, setSelectedDay] = useState<number>(CURRENT_DAY); // Dia padrão com dados
  const [searchTerm, setSearchTerm] = useState('');
  const [registroSearchTerm, setRegistroSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'regular' | 'atencao' | 'critico'>('all');
  const [sortOrder, setSortOrder] = useState<'desc_faltas' | 'asc_name' | 'desc_name'>('desc_faltas');
  
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedShiftLogin, setSelectedShiftLogin] = useState<'A'|'B'|'C'|'D'|'SUPERVISAO'>('A');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Derived shift from user email
  const currentShift = useMemo(() => {
    if (!user?.email) return null;
    if (user.email === 'supervisao@vonixx.com' || user.email === 'bernard30101994@gmail.com') return 'ALL';
    const match = user.email.match(/turno\.?([abcd])@vonixx\.com/i);
    return match ? (match[1].toUpperCase() as 'A'|'B'|'C'|'D') : null;
  }, [user]);

  const isSupervision = useMemo(() => currentShift === 'ALL', [currentShift]);
  const [supervisionShiftFilter, setSupervisionShiftFilter] = useState<'A'|'B'|'C'|'D'>('A');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const isStandalone = useMemo(() => {
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  }, []);

  const isAdminUser = useMemo(() => user?.email === 'bernard30101994@gmail.com' || user?.email === 'supervisao@vonixx.com', [user]);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  // Estado global de funcionários
  const [employees, setEmployees] = useState<{id: string, name: string}[]>([]);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');

  // Estado global de faltas: mapeia o ID do funcionário para um objeto com los dias e status
  const [attendance, setAttendance] = useState<Record<string, Record<number, Status>>>({});
  const [notes, setNotes] = useState<Record<string, Record<number, string>>>({});
  const [dataLoading, setDataLoading] = useState(true);

  // Estado para alterações pendentes (não salvas)
  const [pendingAttendance, setPendingAttendance] = useState<Record<string, Record<number, Status>>>({});
  const [pendingNotes, setPendingNotes] = useState<Record<string, Record<number, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      // Check if we are at the top and pulling down
      if (window.scrollY === 0) {
        // We don't prevent all touchmove, just those that might trigger refresh
      }
    };

    // More effective way to disable pull-to-refresh in JS
    document.body.style.overscrollBehaviorY = 'none';
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Listen for completions to show notifications
  useEffect(() => {
    if (!user) return;

    const startTime = Date.now();

    const unsub = onSnapshot(collection(db, 'completions'), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const completedAt = data.completedAt?.toMillis();
          
          // Only notify if it happened after we started the app and it's not our own shift
          if (completedAt && completedAt > startTime && data.shift !== currentShift) {
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('Turno Finalizado', {
                  body: `O Turno ${data.shift} finalizou a lista do dia ${data.day}.`,
                  icon: 'https://cdn-icons-png.flaticon.com/512/3589/3589030.png'
                });
              } catch (e) {
                // Fallback for some mobile browsers
                console.log("Notification error:", e);
              }
            }
          }
        }
      });
    });

    return () => unsub();
  }, [user, currentShift]);

  // Bootstrap data and listen to Firestore
  useEffect(() => {
    let active = true;
    let unsubEmployees: (() => void) | null = null;
    let unsubAttendance: (() => void) | null = null;

    if (!user || !currentShift) {
      setEmployees([]);
      setAttendance({});
      setNotes({});
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    // Function to bootstrap initial data if empty
    const bootstrapData = async () => {
      // ONLY Admin or Turno A can perform bootstrap/migration
      if (currentShift !== 'A' && !isAdminUser) return;

      try {
        const empSnapshot = await getDocs(collection(db, 'employees'));
        if (!active) return;
        
        const batch = writeBatch(db);
        let needsMigration = false;

        if (empSnapshot.empty) {
          console.log("Bootstrapping initial data for Turno A...");
          
          // Add employees
          EMPLOYEES.forEach(emp => {
            const empRef = doc(db, 'employees', emp.id);
            batch.set(empRef, { name: emp.name, createdAt: new Date(), shift: 'A' });
          });

          // Add attendance
          Object.entries(INITIAL_ATTENDANCE).forEach(([empId, days]) => {
            Object.entries(days).forEach(([dayStr, status]) => {
              const day = parseInt(dayStr);
              const recordId = `${empId}_${day}`;
              const attRef = doc(db, 'attendance', recordId);
              batch.set(attRef, {
                empId,
                day,
                status,
                note: '',
                updatedAt: new Date(),
                shift: 'A'
              });
            });
          });
          needsMigration = true;
        } else {
          // Migration for existing documents without shift
          empSnapshot.forEach(docSnap => {
            if (!docSnap.data().shift) {
              batch.update(docSnap.ref, { shift: 'A' });
              needsMigration = true;
            }
          });

          const attSnapshot = await getDocs(collection(db, 'attendance'));
          if (!active) return;
          
          attSnapshot.forEach(docSnap => {
            if (!docSnap.data().shift) {
              batch.update(docSnap.ref, { shift: 'A' });
              needsMigration = true;
            }
          });
        }

        if (needsMigration && active) {
          await batch.commit();
          console.log("Bootstrap/Migration complete.");
        }
      } catch (error) {
        console.error("Bootstrap/Migration error:", error);
      }
    };

    const setupListeners = async () => {
      await bootstrapData();
      if (!active) return;

      // Ensure we have a valid shift filter before querying
      const shiftToQuery = isSupervision ? supervisionShiftFilter : currentShift;
      if (!shiftToQuery) {
        setDataLoading(false);
        return;
      }

      // Listen to employees
      const qEmployees = query(collection(db, 'employees'), where('shift', '==', shiftToQuery));

      unsubEmployees = onSnapshot(qEmployees, (snapshot) => {
        if (!active) return;
        const emps: {id: string, name: string}[] = [];
        snapshot.forEach(doc => {
          emps.push({ id: doc.id, name: doc.data().name });
        });
        setEmployees(emps.sort((a, b) => a.name.localeCompare(b.name)));
        setDataLoading(false);
      }, (error) => {
        if (active) handleFirestoreError(error, OperationType.GET, 'employees');
      });

      // Listen to attendance
      const qAttendance = query(collection(db, 'attendance'), where('shift', '==', shiftToQuery));

      unsubAttendance = onSnapshot(qAttendance, (snapshot) => {
        if (!active) return;
        const newAttendance: Record<string, Record<number, Status>> = {};
        const newNotes: Record<string, Record<number, string>> = {};
        
        snapshot.forEach(doc => {
          const data = doc.data();
          const { empId, day, status, note } = data;
          
          if (!newAttendance[empId]) newAttendance[empId] = {};
          newAttendance[empId][day] = status as Status;
          
          if (note) {
            if (!newNotes[empId]) newNotes[empId] = {};
            newNotes[empId][day] = note;
          }
        });
        
        setAttendance(newAttendance);
        setNotes(newNotes);
        setDataLoading(false);
      }, (error) => {
        if (active) handleFirestoreError(error, OperationType.GET, 'attendance');
      });
    };

    setupListeners();

    return () => {
      active = false;
      if (unsubEmployees) unsubEmployees();
      if (unsubAttendance) unsubAttendance();
    };
  }, [user, currentShift, isSupervision, supervisionShiftFilter, isAdminUser]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName.trim()) return;
    
    // Find the highest ID to create a new one
    const maxId = Math.max(...employees.map(emp => parseInt(emp.id)), 0);
    const newId = (maxId + 1).toString();
    
    if (!currentShift || currentShift === 'ALL') return;

    try {
      await setDoc(doc(db, 'employees', newId), {
        name: newEmployeeName.toUpperCase(),
        createdAt: new Date(),
        shift: currentShift
      });
      setNewEmployeeName('');
      setShowAddEmployeeModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'employees');
    }
  };

  // Ensure selectedDay is valid initially
  React.useEffect(() => {
    if (!VALID_WORK_DAYS.includes(selectedDay) && VALID_WORK_DAYS.length > 0) {
      setSelectedDay(VALID_WORK_DAYS[VALID_WORK_DAYS.length - 1]);
    }
  }, [selectedDay]);

  const handlePrevDay = () => {
    const currentIndex = VALID_WORK_DAYS.indexOf(selectedDay);
    if (currentIndex > 0) setSelectedDay(VALID_WORK_DAYS[currentIndex - 1]);
  };

  const handleNextDay = () => {
    const currentIndex = VALID_WORK_DAYS.indexOf(selectedDay);
    if (currentIndex < VALID_WORK_DAYS.length - 1) setSelectedDay(VALID_WORK_DAYS[currentIndex + 1]);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const getStatusForDay = (empId: string, day: number) => {
    return pendingAttendance[empId]?.[day] ?? attendance[empId]?.[day] ?? 'P';
  };

  // --- CÁLCULOS DINÂMICOS ---
  
  const totalFaltasMes = useMemo(() => {
    let count = 0;
    Object.values(attendance).forEach(empRecord => {
      Object.entries(empRecord).forEach(([dayStr, status]) => {
        const day = Number(dayStr);
        if (status === 'F' && isWorkDay(day)) count++;
      });
    });
    return count;
  }, [attendance]);

  const funcionariosComFaltas = useMemo(() => {
    return employees.filter(emp => {
      return Object.entries(attendance[emp.id] || {}).some(([dayStr, status]) => {
        const day = Number(dayStr);
        return status === 'F' && isWorkDay(day) && isValidDay(day);
      });
    }).length;
  }, [attendance, employees]);

  const faltasDoDia = useMemo(() => {
    if (!isWorkDay(selectedDay) || !isValidDay(selectedDay)) return 0;
    let count = 0;
    Object.values(attendance).forEach(empRecord => {
      if (empRecord[selectedDay] === 'F') count++;
    });
    return count;
  }, [attendance, selectedDay]);

  const taxaAbsenteismo = useMemo(() => {
    let totalFeriasEAfastamentos = 0;
    Object.values(attendance).forEach(empRecord => {
      Object.entries(empRecord).forEach(([dayStr, status]) => {
        const day = Number(dayStr);
        if ((status === 'Fe' || status === 'A') && isWorkDay(day) && isValidDay(day)) {
          totalFeriasEAfastamentos++;
        }
      });
    });

    const totalDiasTrabalho = (employees.length * VALID_WORK_DAYS.length) - totalFeriasEAfastamentos;
    if (totalDiasTrabalho <= 0) return "0.0";
    return ((totalFaltasMes / totalDiasTrabalho) * 100).toFixed(1);
  }, [totalFaltasMes, employees.length, attendance]);

  const dailyData = useMemo(() => {
    // Mostrar apenas até o dia atual
    return VALID_WORK_DAYS.map(day => {
      let faltas = 0;
      Object.values(attendance).forEach(empRecord => {
        if (empRecord[day] === 'F') faltas++;
      });
      return { day: day.toString(), faltas };
    });
  }, [attendance, VALID_WORK_DAYS]);

  const weekdayData = useMemo(() => {
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const counts: Record<string, number> = { 'Dom': 0, 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0, 'Sáb': 0 };
    
    Object.values(attendance).forEach(empRecord => {
      Object.entries(empRecord).forEach(([dayStr, status]) => {
        const day = parseInt(dayStr);
        if (status === 'F' && isWorkDay(day)) {
          // Abril de 2026 começa numa Quarta-feira
          const date = new Date(2026, 3, day); 
          const weekday = weekdays[date.getDay()];
          counts[weekday]++;
        }
      });
    });
    
    // Ordenar para começar na Segunda
    const orderedDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    return orderedDays.map(wd => ({ day: wd, faltas: counts[wd] }));
  }, [attendance]);

  const employeeData = useMemo(() => {
    return employees.map(emp => {
      let faltas = 0;
      if (attendance[emp.id]) {
        Object.entries(attendance[emp.id]).forEach(([dayStr, status]) => {
          const day = Number(dayStr);
          if (status === 'F' && isWorkDay(day)) faltas++;
        });
      }
      return {
        ...emp,
        faltas
      };
    }).sort((a, b) => b.faltas - a.faltas);
  }, [attendance, employees]);

  const filteredEmployees = useMemo(() => {
    let result = employeeData;

    if (searchTerm) {
      result = result.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(emp => {
        if (statusFilter === 'critico') return emp.faltas > 3;
        if (statusFilter === 'atencao') return emp.faltas > 0 && emp.faltas <= 3;
        if (statusFilter === 'regular') return emp.faltas === 0;
        return true;
      });
    }

    if (sortOrder === 'asc_name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'desc_name') {
      result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    } else {
      // desc_faltas is the default from employeeData
      result = [...result].sort((a, b) => b.faltas - a.faltas);
    }

    return result;
  }, [searchTerm, statusFilter, sortOrder, employeeData]);

  const filteredRegistroEmployees = useMemo(() => {
    let result = [...employees];
    if (registroSearchTerm) {
      result = result.filter(emp => 
        emp.name.toLowerCase().includes(registroSearchTerm.toLowerCase())
      );
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, registroSearchTerm]);

  const topEmployees = useMemo(() => {
    return [...employeeData].slice(0, 10).reverse();
  }, [employeeData]);

  const topEmployee = useMemo(() => {
    return employeeData.length > 0 ? employeeData[0] : null;
  }, [employeeData]);

  // --- FUNÇÕES DE AÇÃO ---

  const setStatus = (empId: string, day: number, status: Status) => {
    setPendingAttendance(prev => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || {}),
        [day]: status
      }
    }));
  };

  const setNote = (empId: string, day: number, note: string) => {
    setPendingNotes(prev => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || {}),
        [day]: note
      }
    }));
  };

  const handleSave = async () => {
    if (!user || !currentShift || currentShift === 'ALL' || isSaving) return;
    
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      let hasChanges = false;

      // Processar alterações de status
      Object.entries(pendingAttendance).forEach(([empId, days]) => {
        Object.entries(days).forEach(([dayStr, status]) => {
          const day = parseInt(dayStr);
          const recordId = `${empId}_${day}`;
          const attRef = doc(db, 'attendance', recordId);
          
          batch.set(attRef, {
            empId,
            day,
            status,
            note: pendingNotes[empId]?.[day] ?? notes[empId]?.[day] ?? '',
            updatedAt: serverTimestamp(),
            shift: currentShift
          }, { merge: true });
          hasChanges = true;
        });
      });

      // Processar alterações de notas que não tiveram alteração de status
      Object.entries(pendingNotes).forEach(([empId, days]) => {
        Object.entries(days).forEach(([dayStr, note]) => {
          const day = parseInt(dayStr);
          if (pendingAttendance[empId]?.[day]) return; // Já processado acima

          const recordId = `${empId}_${day}`;
          const attRef = doc(db, 'attendance', recordId);
          
          batch.set(attRef, {
            empId,
            day,
            status: attendance[empId]?.[day] ?? 'P',
            note,
            updatedAt: serverTimestamp(),
            shift: currentShift
          }, { merge: true });
          hasChanges = true;
        });
      });

      if (hasChanges) {
        await batch.commit();
        
        // Verificar se a lista está totalmente completa para enviar notificação
        const shiftEmployees = employees;
        const isFullyComplete = shiftEmployees.every(emp => {
          const status = pendingAttendance[emp.id]?.[selectedDay] ?? attendance[emp.id]?.[selectedDay];
          return !!status;
        });

        if (isFullyComplete) {
          const completionId = `${currentShift}_${selectedDay}`;
          await setDoc(doc(db, 'completions', completionId), {
            shift: currentShift,
            day: selectedDay,
            completedAt: serverTimestamp(),
            completedBy: user.email
          }, { merge: true });
        }

        // Limpar estados pendentes
        setPendingAttendance({});
        setPendingNotes({});
        alert("Alterações salvas com sucesso!");
      } else {
        alert("Nenhuma alteración para salvar.");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const email = selectedShiftLogin === 'SUPERVISAO' 
      ? 'supervisao@vonixx.com'
      : `turno.${selectedShiftLogin.toLowerCase()}@vonixx.com`;
    
    let passwordToUse = loginPassword;

    // Password validation logic
    if (selectedShiftLogin === 'A') {
      if (loginPassword !== 'TurnoA@Vonixx2026') {
        setLoginError('Senha incorreta para o Turno A.');
        return;
      }
    } else if (selectedShiftLogin === 'SUPERVISAO') {
      if (loginPassword !== 'Supervisao@Vonixx2026') {
        setLoginError('Senha incorreta para Supervisão.');
        return;
      }
    } else {
      // For shifts B, C, D - no password required in UI, use a default one for Firebase
      passwordToUse = 'vonixx2026';
    }

    try {
      await loginWithEmail(email, passwordToUse);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setLoginError('Contraseña incorrecta.');
      } else if (error.code === 'auth/invalid-credential') {
        setLoginError('Contraseña incorrecta.');
      } else {
        setLoginError('Error: ' + error.message);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full space-y-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard de Absenteísmo</h1>
            <p className="text-gray-500 mt-2">Escolha seu perfil para entrar.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Perfil / Turno</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setSelectedShiftLogin('SUPERVISAO')}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors col-span-2 ${
                    selectedShiftLogin === 'SUPERVISAO' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Supervisão
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['A', 'B', 'C', 'D'].map(shift => (
                  <button
                    key={shift}
                    type="button"
                    onClick={() => setSelectedShiftLogin(shift as any)}
                    className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                      selectedShiftLogin === shift 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {shift}
                  </button>
                ))}
              </div>
            </div>

            {(selectedShiftLogin === 'A' || selectedShiftLogin === 'SUPERVISAO') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Digite a senha"
                  required
                />
              </div>
            )}

            {loginError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                {loginError}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-sm"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
      {/* Header */}
      <header className="bg-[#1e3a8a] border-b border-blue-900 sticky top-0 z-20 shadow-md">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:h-16 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate uppercase">
              Dashboard de Absenteísmo <span className="text-blue-200 font-normal hidden sm:inline">— Abril 2026 ({isSupervision ? 'Supervisão' : `Turno ${currentShift}`})</span>
              {!isSupervision && <span className="text-blue-200 font-normal sm:hidden block text-xs mt-0.5">Turno {currentShift} — Abril 2026</span>}
              {isSupervision && <span className="text-blue-200 font-normal sm:hidden block text-xs mt-0.5">Supervisão — Abril 2026</span>}
            </h1>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
            {isSupervision && (
              <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1 border border-white/20">
                {['A', 'B', 'C', 'D'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSupervisionShiftFilter(s as any)}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                      supervisionShiftFilter === s 
                        ? 'bg-white text-blue-900' 
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {/* Seletor Global de Dia */}
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1 border border-white/20 flex-1 sm:flex-none justify-center">
              {activeTab === 'registro' && (
                <button 
                  onClick={handlePrevDay}
                  disabled={VALID_WORK_DAYS.indexOf(selectedDay) <= 0}
                  className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              
              <div className="flex items-center">
                <CalendarDays className="w-4 h-4 text-blue-200 ml-2 hidden sm:block" />
                <select 
                  value={selectedDay} 
                  onChange={(e) => setSelectedDay(Number(e.target.value))}
                  className="bg-transparent border-none text-sm font-medium text-white focus:ring-0 cursor-pointer py-1 pr-8 pl-2 [&>option]:text-gray-900"
                >
                  {VALID_WORK_DAYS.map(d => (
                    <option key={d} value={d}>Dia {d}</option>
                  ))}
                </select>
              </div>

              {activeTab === 'registro' && (
                <button 
                  onClick={handleNextDay}
                  disabled={VALID_WORK_DAYS.indexOf(selectedDay) >= VALID_WORK_DAYS.length - 1}
                  className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
            <button 
              onClick={logout}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 shrink-0"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">Sair</span>
            </button>
          </div>
        </div>

        {deferredPrompt && !isStandalone && (
          <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between animate-in slide-in-from-top duration-300">
            <span className="text-xs sm:text-sm font-medium">Instale o App para receber notificações e usar offline.</span>
            <button 
              onClick={handleInstallClick}
              className="bg-white text-blue-600 px-3 py-1 rounded-lg text-xs font-bold uppercase shrink-0 ml-2"
            >
              Instalar
            </button>
          </div>
        )}
        
        {/* Tabs */}
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex gap-6 bg-white">
          <button 
            className={`py-3 text-sm 2xl:text-base font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard className="w-4 h-4 2xl:w-5 2xl:h-5" />
            Dashboard
          </button>
          {!isSupervision && (
            <button 
              className={`py-3 text-sm 2xl:text-base font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'registro' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('registro')}
            >
              <ClipboardList className="w-4 h-4 2xl:w-5 2xl:h-5" />
              Lançamento de Frequência
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 2xl:py-10">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Total Faltas */}
              <div className="bg-red-50 rounded-xl p-4 sm:p-6 border border-red-100 shadow-sm flex flex-col items-center justify-center text-center">
                <h3 className="text-xs sm:text-sm 2xl:text-base font-medium text-gray-700 mb-2">Total de Faltas no Mês</h3>
                <div className="text-3xl sm:text-4xl 2xl:text-5xl font-bold text-red-600">{totalFaltasMes}</div>
              </div>

              {/* Taxa Absenteismo */}
              <div className="bg-orange-50 rounded-xl p-4 sm:p-6 border border-orange-100 shadow-sm flex flex-col items-center justify-center text-center">
                <h3 className="text-xs sm:text-sm 2xl:text-base font-medium text-gray-700 mb-2">Taxa de Absenteísmo</h3>
                <div className="text-3xl sm:text-4xl 2xl:text-5xl font-bold text-orange-600">{taxaAbsenteismo}%</div>
              </div>

              {/* Funcionarios */}
              <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-100 shadow-sm flex flex-col items-center justify-center text-center">
                <h3 className="text-xs sm:text-sm 2xl:text-base font-medium text-gray-700 mb-2">Funcionários</h3>
                <div className="text-3xl sm:text-4xl 2xl:text-5xl font-bold text-blue-600">{employees.length}</div>
              </div>

              {/* Maior No Faltas */}
              <div className="bg-green-50 rounded-xl p-4 sm:p-6 border border-green-100 shadow-sm flex flex-col items-center justify-center text-center">
                <h3 className="text-xs sm:text-sm 2xl:text-base font-medium text-gray-700 mb-2">Maior Nº de Faltas</h3>
                <div className="text-sm sm:text-base 2xl:text-lg font-bold text-green-700 leading-tight uppercase">
                  {topEmployee ? topEmployee.name : '-'}
                </div>
                <div className="mt-1 text-sm 2xl:text-base font-bold text-green-600">
                  {topEmployee ? `(${topEmployee.faltas}F)` : ''}
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Left Column: Tables */}
              <div className="lg:col-span-1 space-y-6">
                {/* Table: Dia vs Faltas no Dia */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
                  <div className="bg-[#1e3a8a] px-4 py-3 shrink-0">
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider text-center">Dia vs Faltas no Dia</h3>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dia</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Faltas</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dailyData.map((d, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-xs font-medium text-gray-900">{d.day.padStart(2, '0')}/abr</td>
                            <td className="px-4 py-2 text-xs text-gray-500 text-center">{d.faltas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table: Dia Semana vs Faltas */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-[#1e3a8a] px-4 py-3">
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider text-center">Dia Semana vs Faltas</h3>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dia Semana</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Faltas</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {weekdayData.map((wd, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-xs font-medium text-gray-900">{wd.day}</td>
                          <td className="px-4 py-2 text-xs text-gray-500 text-center">{wd.faltas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Charts */}
              <div className="lg:col-span-3 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Ranking Chart */}
                  <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm flex flex-col">
                    <h3 className="text-sm 2xl:text-base font-semibold text-gray-900 mb-6 text-center">Faltas por Funcionário (Ranking)</h3>
                    <div className="h-[300px] sm:h-[350px] 2xl:h-[450px] w-full mt-auto">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topEmployees} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, fill: '#6b7280' }} />
                          <Tooltip 
                            cursor={{ fill: '#f3f4f6' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="faltas" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12}>
                            <LabelList dataKey="faltas" position="right" fill="#6b7280" fontSize={10} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Weekday Chart */}
                  <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm flex flex-col">
                    <h3 className="text-sm 2xl:text-base font-semibold text-gray-900 mb-6 text-center">Faltas por Dia da Semana</h3>
                    <div className="h-[300px] sm:h-[350px] 2xl:h-[450px] w-full mt-auto">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weekdayData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            cursor={{ fill: '#f3f4f6' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="faltas" fill="#f97316" radius={[4, 4, 0, 0]} barSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Daily Evolution Chart */}
                <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm flex flex-col">
                  <h3 className="text-sm 2xl:text-base font-semibold text-gray-900 mb-6 text-center">Evolução Diária de Faltas</h3>
                  <div className="h-[300px] sm:h-[350px] 2xl:h-[450px] w-full mt-auto">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="day" 
                          tick={{ fontSize: 12, fill: '#6b7280' }} 
                          axisLine={false} 
                          tickLine={false}
                          tickFormatter={(val) => `${val}/4/26`}
                        />
                        <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          labelFormatter={(label) => `Dia ${label} de Abril`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="faltas" 
                          stroke="#1e3a8a" 
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#1e3a8a', strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Employee Details Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col max-h-[600px]">
              <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Detalhamento por Funcionário</h2>
                  <p className="text-sm text-gray-500">Acompanhamento individual de faltas no mês.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar funcionário..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="w-full sm:w-auto pl-9 pr-8 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                      >
                        <option value="all">Todos os Status</option>
                        <option value="regular">Regular (0)</option>
                        <option value="atencao">Atenção (1-3)</option>
                        <option value="critico">Crítico (4+)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto overflow-y-auto flex-1">
                <table className="w-full text-left border-collapse min-w-full sm:min-w-[600px]">
                  <thead className="bg-white sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="py-3 px-4 sm:px-6 text-xs 2xl:text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap">
                        <button 
                          onClick={() => setSortOrder(prev => prev === 'asc_name' ? 'desc_name' : 'asc_name')}
                          className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                        >
                          Funcionário
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4 sm:px-6 text-xs 2xl:text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-center whitespace-nowrap hidden sm:table-cell">ID</th>
                      <th className="py-3 px-4 sm:px-6 text-xs 2xl:text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-center whitespace-nowrap">
                        <button 
                          onClick={() => setSortOrder('desc_faltas')}
                          className="flex items-center justify-center gap-1 hover:text-gray-700 transition-colors w-full"
                        >
                          <span className="hidden sm:inline">Total de Faltas</span>
                          <span className="sm:hidden">Faltas</span>
                          {sortOrder === 'desc_faltas' && <ArrowDown className="w-3 h-3" />}
                        </button>
                      </th>
                      <th className="py-3 px-4 sm:px-6 text-xs 2xl:text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-center whitespace-nowrap hidden sm:table-cell">Status</th>
                      <th className="py-3 px-4 sm:px-6 text-xs 2xl:text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-left whitespace-nowrap">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 sm:px-6">
                          <div className="flex flex-col">
                            <span className="text-sm 2xl:text-base font-medium text-gray-900">{emp.name}</span>
                            <div className="flex items-center gap-2 mt-0.5 sm:hidden">
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">ID: {emp.id.padStart(3, '0')}</span>
                              <span className="text-[10px] text-gray-400">•</span>
                              {emp.faltas === 0 ? (
                                <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Regular</span>
                              ) : (
                                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Atenção</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-sm 2xl:text-base text-gray-500 text-center whitespace-nowrap hidden sm:table-cell">{emp.id.padStart(3, '0')}</td>
                        <td className="py-3 px-4 sm:px-6 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs font-bold ${
                            emp.faltas > 3 ? 'bg-red-100 text-red-700' : 
                            emp.faltas > 0 ? 'bg-orange-100 text-orange-700' : 
                            'bg-green-100 text-green-700'
                          }`}>
                            {emp.faltas}
                          </span>
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-center hidden sm:table-cell">
                          {emp.faltas === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                              <CheckCircle2 className="w-3 h-3" /> Regular
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600">
                              <AlertCircle className="w-3 h-3" /> Atenção
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-xs text-gray-500 max-w-[200px] truncate">
                          {Object.entries(attendance[emp.id] || {})
                            .filter(([_, status]) => status === 'F')
                            .map(([day, _]) => notes[emp.id]?.[Number(day)])
                            .filter(Boolean)
                            .join(', ')}
                        </td>
                      </tr>
                    ))}
                    {filteredEmployees.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                          Nenhum funcionário encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'registro' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col max-h-[800px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Registro Header */}
            <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50 flex flex-col gap-4 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    Lançamento de Frequência
                    {!isWorkDay(selectedDay) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800 border border-gray-300">
                        Folga (12x36)
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-gray-500">Registre as presenças e faltas para o dia selecionado.</p>
                </div>
                
                {isWorkDay(selectedDay) && (
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex flex-col items-center px-2 sm:px-4 border-r border-gray-200">
                      <span className="text-xl sm:text-2xl font-bold text-green-600">
                        {employees.length - employees.filter(emp => {
                          const status = getStatusForDay(emp.id, selectedDay);
                          return status !== 'P';
                        }).length}
                      </span>
                      <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Presentes</span>
                    </div>
                    <div className="flex flex-col items-center px-2 sm:px-4 sm:border-r border-gray-200">
                      <span className="text-xl sm:text-2xl font-bold text-red-600">
                        {employees.filter(emp => getStatusForDay(emp.id, selectedDay) === 'F').length}
                      </span>
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Faltas</span>
                    </div>
                    <div className="flex flex-col items-center px-2 sm:px-4 border-r border-gray-200">
                      <span className="text-xl sm:text-2xl font-bold text-blue-600">
                        {employees.filter(emp => getStatusForDay(emp.id, selectedDay) === 'Fe').length}
                      </span>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Férias</span>
                    </div>
                    <div className="flex flex-col items-center px-2 sm:px-4">
                      <span className="text-xl sm:text-2xl font-bold text-purple-600">
                        {employees.filter(emp => getStatusForDay(emp.id, selectedDay) === 'A').length}
                      </span>
                      <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Afastamentos</span>
                    </div>
                  </div>
                )}
              </div>
              
              {isWorkDay(selectedDay) && (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowAddEmployeeModal(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Novo Funcionário
                  </button>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar funcionário..." 
                      value={registroSearchTerm}
                      onChange={(e) => setRegistroSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Employee List for Attendance */}
            {!isWorkDay(selectedDay) ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <CalendarX className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Dia de Folga</h3>
                <p className="text-gray-500 max-w-md">
                  De acordo com a escala 12x36, este dia é considerado folga para todos os funcionários. Não é necessário registrar frequência.
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 divide-y divide-gray-100 p-2 sm:p-4">
                {filteredRegistroEmployees.map(emp => {
                  const currentStatus = pendingAttendance[emp.id]?.[selectedDay] ?? attendance[emp.id]?.[selectedDay] ?? 'P';
                  const currentNote = pendingNotes[emp.id]?.[selectedDay] ?? notes[emp.id]?.[selectedDay] ?? '';
                  const isModified = pendingAttendance[emp.id]?.[selectedDay] !== undefined || pendingNotes[emp.id]?.[selectedDay] !== undefined;
                  
                  return (
                    <div key={emp.id} className={`p-3 sm:p-4 flex flex-col gap-3 hover:bg-gray-50 rounded-xl transition-colors ${isModified ? 'bg-blue-50/30' : ''}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{emp.name}</span>
                            {isModified && <span className="w-2 h-2 bg-blue-500 rounded-full" title="Alteração não salva"></span>}
                          </div>
                          <span className="text-xs text-gray-400">ID: {emp.id.padStart(3, '0')}</span>
                          {currentNote && <span className="text-xs text-blue-600 mt-1 italic">Obs: {currentNote}</span>}
                        </div>
                        
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 sm:gap-2 bg-gray-100 p-1 sm:p-1.5 rounded-lg shrink-0 self-start sm:self-auto max-w-full">
                          <button 
                            onClick={() => setStatus(emp.id, selectedDay, 'P')}
                            disabled={isLocked && !isModified}
                            className={`flex-1 sm:flex-none flex items-center justify-center min-w-[40px] sm:min-w-[80px] px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                              currentStatus === 'P' 
                                ? 'bg-white text-green-700 shadow-sm ring-1 ring-gray-200' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            } ${isLocked && !isModified ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Presente"
                          >
                            <span className="sm:hidden">P</span>
                            <span className="hidden sm:inline">Presente</span>
                          </button>
                          <button 
                            onClick={() => setStatus(emp.id, selectedDay, 'F')}
                            disabled={isLocked && !isModified}
                            className={`flex-1 sm:flex-none flex items-center justify-center min-w-[40px] sm:min-w-[80px] px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                              currentStatus === 'F' 
                                ? 'bg-red-500 text-white shadow-sm ring-1 ring-red-600' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            } ${isLocked && !isModified ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Falta"
                          >
                            <span className="sm:hidden">F</span>
                            <span className="hidden sm:inline">Falta</span>
                          </button>
                          <button 
                            onClick={() => setStatus(emp.id, selectedDay, 'Fe')}
                            disabled={isLocked && !isModified}
                            className={`flex-1 sm:flex-none flex items-center justify-center min-w-[40px] sm:min-w-[80px] px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                              currentStatus === 'Fe' 
                                ? 'bg-blue-500 text-white shadow-sm ring-1 ring-blue-600' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            } ${isLocked && !isModified ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Férias/Feriado"
                          >
                            <span className="sm:hidden">Fe</span>
                            <span className="hidden sm:inline">Férias</span>
                          </button>
                          <button 
                            onClick={() => setStatus(emp.id, selectedDay, 'A')}
                            disabled={isLocked && !isModified}
                            className={`flex-1 sm:flex-none flex items-center justify-center min-w-[40px] sm:min-w-[80px] px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                              currentStatus === 'A' 
                                ? 'bg-purple-500 text-white shadow-sm ring-1 ring-purple-600' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            } ${isLocked && !isModified ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Afastamento"
                          >
                            <span className="sm:hidden">A</span>
                            <span className="hidden sm:inline">Afastamento</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Notes Field */}
                      <div className="flex items-center gap-2 mt-1">
                        <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
                        <input 
                          type="text" 
                          placeholder="Adicionar observação..." 
                          value={currentNote}
                          readOnly={isLocked && !isModified}
                          onChange={(e) => setNote(emp.id, selectedDay, e.target.value)}
                          className={`flex-1 text-sm bg-transparent border-b border-gray-200 focus:border-blue-500 focus:outline-none px-1 py-1 transition-colors ${isLocked && !isModified ? 'cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Save Button Area */}
            {isWorkDay(selectedDay) && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                {isLocked && (
                  <button
                    onClick={() => setIsLocked(false)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Editar registros
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving || (Object.keys(pendingAttendance).length === 0 && Object.keys(pendingNotes).length === 0)}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-lg ml-auto ${
                    isSaving || (Object.keys(pendingAttendance).length === 0 && Object.keys(pendingNotes).length === 0)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                      : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105 active:scale-95'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Salvar e Notificar
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Novo Funcionário</h3>
              <button 
                onClick={() => setShowAddEmployeeModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-4 sm:p-6 space-y-4">
              <div>
                <label htmlFor="employeeName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  id="employeeName"
                  type="text"
                  required
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  placeholder="Digite o nome do funcionário..."
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newEmployeeName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
