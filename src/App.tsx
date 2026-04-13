import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Search, 
  Users, 
  CalendarX, 
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
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
  LogOut,
  Edit2,
  Trash2,
  Download,
  XCircle,
  Palmtree,
  Stethoscope
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
  LabelList,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { auth, db, loginWithEmail, logout, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, onSnapshot, getDocs, writeBatch, query, where, serverTimestamp, updateDoc, deleteDoc, limit } from 'firebase/firestore';
import * as XLSX from 'xlsx';

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

// Configurações de Data Dinâmicas
const now = new Date();
const INITIAL_MONTH = now.getMonth(); // 0-11
const INITIAL_YEAR = now.getFullYear();

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const getDaysInMonth = (month: number, year: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const isWorkDay = (day: number, month: number, year: number) => {
  const date = new Date(year, month, day, 12, 0, 0);
  // Lógica 12x36: Alternância de dias.
  // Referência: 13/04/2026 foi um dia de trabalho (segunda-feira).
  const refDate = new Date(2026, 3, 13, 12, 0, 0);
  const diffTime = date.getTime() - refDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays % 2 === 0;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'registro'>('dashboard');
  const [currentMonth, setCurrentMonth] = useState(INITIAL_MONTH);
  const [currentYear, setCurrentYear] = useState(INITIAL_YEAR);
  
  const daysInMonth = useMemo(() => getDaysInMonth(currentMonth, currentYear), [currentMonth, currentYear]);

  const currentDayOfMonth = useMemo(() => {
    const today = new Date();
    if (today.getMonth() === currentMonth && today.getFullYear() === currentYear) {
      return today.getDate();
    }
    return daysInMonth; // Se for mês passado, mostra todos os dias
  }, [currentMonth, currentYear, daysInMonth]);

  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all'); // Dia padrão com dados
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

  const isValidDay = useCallback((day: number) => {
    if (currentYear > now.getFullYear()) return false;
    if (currentYear === now.getFullYear() && currentMonth > now.getMonth()) return false;
    if (currentYear === now.getFullYear() && currentMonth === now.getMonth()) {
      return day <= now.getDate() && day !== 1;
    }
    return day !== 1; // Para meses passados, todos os dias (exceto dia 1 conforme regra anterior) são válidos
  }, [currentMonth, currentYear]);

  const VALID_WORK_DAYS = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1)
      .filter(d => isWorkDay(d, currentMonth, currentYear) && isValidDay(d));
  }, [daysInMonth, currentMonth, currentYear, isValidDay]);

  const isAdminUser = useMemo(() => user?.email === 'bernard30101994@gmail.com' || user?.email === 'supervisao@vonixx.com', [user]);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  // Estado global de funcionários
  const [employees, setEmployees] = useState<{id: string, name: string}[]>([]);
  const [globalEmployees, setGlobalEmployees] = useState<{id: string, name: string, shift: string}[]>([]);
  const [globalAttendance, setGlobalAttendance] = useState<Record<string, Record<number, Status>>>({});
  const [globalCompletions, setGlobalCompletions] = useState<any[]>([]);
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<{id: string, name: string} | null>(null);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<{id: string, name: string} | null>(null);
  const [newEmployeeName, setNewEmployeeName] = useState('');

  // Estado global de faltas: mapeia o ID do funcionário para um objeto com los dias e status
  const [attendance, setAttendance] = useState<Record<string, Record<number, Status>>>({});
  const [notes, setNotes] = useState<Record<string, Record<number, string>>>({});
  const [dataLoading, setDataLoading] = useState(true);

  // Estado para alterações pendentes (não salvas)
  const [pendingAttendance, setPendingAttendance] = useState<Record<string, Record<number, Status>>>({});
  const [pendingNotes, setPendingNotes] = useState<Record<string, Record<number, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [lockedDays, setLockedDays] = useState<Record<number, boolean>>({});

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

  // Global data for supervisor dashboard
  useEffect(() => {
    if (!isSupervision) return;

    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const emps: any[] = [];
      snapshot.forEach(doc => emps.push({ id: doc.id, ...doc.data() }));
      setGlobalEmployees(emps);
    });

    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const att: any = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.month === currentMonth && data.year === currentYear) {
          if (!att[data.empId]) att[data.empId] = {};
          att[data.empId][data.day] = data.status;
        }
      });
      setGlobalAttendance(att);
    });

    const unsubCompletions = onSnapshot(collection(db, 'completions'), (snapshot) => {
      const comps: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.month === currentMonth && data.year === currentYear) {
          comps.push(data);
        }
      });
      setGlobalCompletions(comps);
    });

    return () => {
      unsubEmployees();
      unsubAttendance();
      unsubCompletions();
    };
  }, [isSupervision, currentMonth, currentYear]);

  const alerts = useMemo(() => {
    if (!isSupervision) return [];
    const newAlerts: { type: 'critical' | 'warning', message: string, icon: any }[] = [];

    // Alert 1: Shifts not completed today
    const shifts: ('A'|'B'|'C'|'D')[] = ['A', 'B', 'C', 'D'];
    const today = new Date().getDate();
    
    if (isWorkDay(today, currentMonth, currentYear)) {
      shifts.forEach(s => {
        const isCompleted = globalCompletions.some(c => c.shift === s && c.day === today);
        if (!isCompleted) {
           newAlerts.push({ 
             type: 'warning', 
             message: `Turno ${s} ainda não realizou o fechamento de hoje.`,
             icon: AlertCircle
           });
        }
      });
    }

    // Alert 2: Employees with 5+ absences
    const criticalEmployees = globalEmployees.filter(emp => {
      const empAtt = globalAttendance[emp.id] || {};
      const faltas = Object.values(empAtt).filter(s => s === 'F').length;
      return faltas >= 5;
    });

    if (criticalEmployees.length > 0) {
      newAlerts.push({ 
        type: 'critical', 
        message: `${criticalEmployees.length} funcionários atingiram o limite de 5 faltas no mês.`,
        icon: XCircle
      });
    }

    return newAlerts;
  }, [isSupervision, globalCompletions, globalEmployees, globalAttendance, currentMonth, currentYear]);

  const leaderboardData = useMemo(() => {
    if (!isSupervision) return [];
    const shifts: ('A'|'B'|'C'|'D')[] = ['A', 'B', 'C', 'D'];
    
    return shifts.map(s => {
      const shiftEmps = globalEmployees.filter(e => e.shift === s);
      if (shiftEmps.length === 0) return { shift: `Turno ${s}`, rate: 0 };
      
      let totalPossible = 0;
      let totalPresent = 0;
      
      shiftEmps.forEach(emp => {
        const empAtt = globalAttendance[emp.id] || {};
        VALID_WORK_DAYS.forEach(day => {
          totalPossible++;
          const status = empAtt[day] || 'P';
          if (status === 'P') totalPresent++;
        });
      });
      
      const rate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
      return { shift: `Turno ${s}`, rate };
    });
  }, [isSupervision, globalEmployees, globalAttendance, VALID_WORK_DAYS]);

  // Bootstrap data and listen to Firestore
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

    // Function to bootstrap initial data if empty
    const bootstrapData = async () => {
      // ONLY Admin or Turno A can perform bootstrap/migration
      if (currentShift !== 'A' && !isAdminUser) return;
      
      // Use a simple check to avoid running this heavy function repeatedly
      if (window.sessionStorage.getItem('bootstrapped')) return;

      try {
        const empSnapshot = await getDocs(query(collection(db, 'employees'), limit(1)));
        if (!active) return;
        
        const batch = writeBatch(db);
        let needsMigration = false;

        if (empSnapshot.empty) {
          console.log("Bootstrapping initial data...");
          
          // Add employees
          EMPLOYEES.forEach(emp => {
            const empRef = doc(db, 'employees', emp.id);
            batch.set(empRef, { name: emp.name, createdAt: new Date(), shift: 'A' });
          });

          // Add attendance
          Object.entries(INITIAL_ATTENDANCE).forEach(([empId, days]) => {
            Object.entries(days).forEach(([dayStr, status]) => {
              const day = parseInt(dayStr);
              const recordId = `${empId}_2026_3_${day}`;
              const attRef = doc(db, 'attendance', recordId);
              batch.set(attRef, {
                empId,
                day,
                month: 3,
                year: 2026,
                status,
                note: '',
                updatedAt: new Date(),
                shift: 'A'
              });
            });
          });
          needsMigration = true;
        }

        if (needsMigration && active) {
          await batch.commit();
          console.log("Bootstrap complete.");
        }
        window.sessionStorage.setItem('bootstrapped', 'true');
      } catch (e) {
        console.error("Bootstrap error:", e);
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
      const qAttendance = query(
        collection(db, 'attendance'), 
        where('shift', '==', shiftToQuery)
      );

      unsubAttendance = onSnapshot(qAttendance, (snapshot) => {
        if (!active) return;
        const newAttendance: Record<string, Record<number, Status>> = {};
        const newNotes: Record<string, Record<number, string>> = {};
        
        snapshot.forEach(doc => {
          const data = doc.data();
          const { empId, day, status, note, month, year } = data;
          
          // Filter by month and year in memory to avoid needing a composite index
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
      }, (error) => {
        if (active) handleFirestoreError(error, OperationType.GET, 'attendance');
      });

      // Listen to completions
      const qCompletions = query(
        collection(db, 'completions'), 
        where('shift', '==', shiftToQuery)
      );
      unsubCompletions = onSnapshot(qCompletions, (snapshot) => {
        if (!active) return;
        const newLockedDays: Record<number, boolean> = {};
        snapshot.forEach(doc => {
          const data = doc.data();
          // Filter by month and year in memory to avoid needing a composite index
          if (data.month === currentMonth && data.year === currentYear) {
            newLockedDays[data.day] = true;
          }
        });
        setLockedDays(newLockedDays);
      }, (error) => {
        if (active) handleFirestoreError(error, OperationType.GET, 'completions');
      });
    };

    setupListeners();

    return () => {
      active = false;
      if (unsubEmployees) unsubEmployees();
      if (unsubAttendance) unsubAttendance();
      if (unsubCompletions) unsubCompletions();
    };
  }, [user, currentShift, isSupervision, supervisionShiftFilter, isAdminUser, currentMonth, currentYear]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName.trim()) return;
    
    // Find the highest ID to create a new one
    const maxId = Math.max(...employees.map(emp => parseInt(emp.id)), 0);
    const newId = (maxId + 1).toString();
    
    const shiftToAssign = isSupervision ? supervisionShiftFilter : currentShift;
    if (!shiftToAssign || shiftToAssign === 'ALL') return;

    try {
      await setDoc(doc(db, 'employees', newId), {
        name: newEmployeeName.toUpperCase(),
        createdAt: serverTimestamp(),
        shift: shiftToAssign
      });
      setNewEmployeeName('');
      setShowAddEmployeeModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'employees');
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !editingEmployee.name.trim()) return;
    try {
      await updateDoc(doc(db, 'employees', editingEmployee.id), {
        name: editingEmployee.name.trim().toUpperCase()
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

  const handleMarkAllPresent = () => {
    const day = selectedDay === 'all' ? currentDayOfMonth : (selectedDay as number);
    if (lockedDays[day]) return;
    
    const batch: Record<string, Status> = {};
    employees.forEach(emp => {
      const currentStatus = pendingAttendance[emp.id]?.[day] ?? attendance[emp.id]?.[day] ?? 'P';
      if (currentStatus !== 'P') {
        batch[emp.id] = 'P';
      }
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

  const handleExportExcel = () => {
    const data = employees.map(emp => {
      const row: any = {
        'ID': emp.id,
        'Nome': emp.name,
        'Turno': isSupervision ? supervisionShiftFilter : currentShift
      };
      
      VALID_WORK_DAYS.forEach(day => {
        const status = attendance[emp.id]?.[day] || 'P';
        row[`Dia ${day}`] = status;
      });
      
      const totalFaltas = VALID_WORK_DAYS.filter(day => attendance[emp.id]?.[day] === 'F').length;
      row['Total Faltas'] = totalFaltas;
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Frequência");
    XLSX.writeFile(wb, `Frequencia_${MONTH_NAMES[currentMonth]}_${currentYear}_Turno_${isSupervision ? supervisionShiftFilter : currentShift}.xlsx`);
  };

  // Ensure selectedDay is valid initially
  React.useEffect(() => {
    if (selectedDay !== 'all' && !VALID_WORK_DAYS.includes(selectedDay as number) && VALID_WORK_DAYS.length > 0) {
      setSelectedDay(VALID_WORK_DAYS[VALID_WORK_DAYS.length - 1]);
    }
  }, [selectedDay]);

  const handlePrevDay = () => {
    const currentIndex = selectedDay === 'all' ? VALID_WORK_DAYS.length : VALID_WORK_DAYS.indexOf(selectedDay as number);
    if (currentIndex > 0) setSelectedDay(VALID_WORK_DAYS[currentIndex - 1]);
  };

  const handleNextDay = () => {
    const currentIndex = selectedDay === 'all' ? -1 : VALID_WORK_DAYS.indexOf(selectedDay as number);
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // --- CÁLCULOS DINÂMICOS ---
  
  const totalFaltasMes = useMemo(() => {
    let count = 0;
    Object.values(attendance).forEach(empRecord => {
      Object.entries(empRecord).forEach(([dayStr, status]) => {
        const day = Number(dayStr);
        if (status === 'F' && isWorkDay(day, currentMonth, currentYear)) count++;
      });
    });
    return count;
  }, [attendance]);

  const funcionariosComFaltas = useMemo(() => {
    return employees.filter(emp => {
      return Object.entries(attendance[emp.id] || {}).some(([dayStr, status]) => {
        const day = Number(dayStr);
        return status === 'F' && isWorkDay(day, currentMonth, currentYear) && isValidDay(day);
      });
    }).length;
  }, [attendance, employees]);

  const faltasDoDia = useMemo(() => {
    if (selectedDay === 'all' || !isWorkDay(selectedDay, currentMonth, currentYear) || !isValidDay(selectedDay)) return 0;
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
        if ((status === 'Fe' || status === 'A') && isWorkDay(day, currentMonth, currentYear) && isValidDay(day)) {
          totalFeriasEAfastamentos++;
        }
      });
    });

    const totalDiasTrabalho = (employees.length * VALID_WORK_DAYS.length) - totalFeriasEAfastamentos;
    if (totalDiasTrabalho <= 0) return "0.0";
    return ((totalFaltasMes / totalDiasTrabalho) * 100).toFixed(1);
  }, [totalFaltasMes, employees.length, attendance]);

  const dailyData = useMemo(() => {
    // Se selectedDay for 'all', mostrar evolução do mês, senão mostrar apenas o dia selecionado
    if (selectedDay === 'all') {
      return VALID_WORK_DAYS.map(day => {
        let faltas = 0;
        Object.values(attendance).forEach(empRecord => {
          if (empRecord[day] === 'F') faltas++;
        });
        return { day: day.toString(), faltas };
      });
    } else {
      // Para um dia específico, mostrar apenas esse dia
      let faltas = 0;
      Object.values(attendance).forEach(empRecord => {
        if (empRecord[selectedDay] === 'F') faltas++;
      });
      return [{ day: selectedDay.toString(), faltas }];
    }
  }, [attendance, VALID_WORK_DAYS, selectedDay]);

  const weekdayData = useMemo(() => {
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const counts: Record<string, number> = { 'Dom': 0, 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0, 'Sáb': 0 };
    
    Object.values(attendance).forEach(empRecord => {
      Object.entries(empRecord).forEach(([dayStr, status]) => {
        const day = parseInt(dayStr);
        // Se selectedDay for 'all', considera o mês, senão apenas o dia selecionado
        if (status === 'F' && isWorkDay(day, currentMonth, currentYear) && (selectedDay === 'all' || day === selectedDay)) {
          const date = new Date(currentYear, currentMonth, day); 
          const weekday = weekdays[date.getDay()];
          counts[weekday]++;
        }
      });
    });
    
    // Ordenar para começar na Segunda
    const orderedDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    return orderedDays.map(wd => ({ day: wd, faltas: counts[wd] }));
  }, [attendance, selectedDay]);

  const employeeData = useMemo(() => {
    return employees.map(emp => {
      let faltas = 0;
      let firstHalfFaltas = 0;
      let secondHalfFaltas = 0;
      
      if (attendance[emp.id]) {
        Object.entries(attendance[emp.id]).forEach(([dayStr, status]) => {
          const day = Number(dayStr);
          if (status === 'F' && isWorkDay(day, currentMonth, currentYear)) {
            faltas++;
            if (day <= 15) firstHalfFaltas++;
            else secondHalfFaltas++;
          }
        });
      }

      // Trend: comparing second half with first half
      let trend: 'up' | 'down' | 'neutral' = 'neutral';
      if (secondHalfFaltas > firstHalfFaltas) trend = 'up';
      else if (secondHalfFaltas < firstHalfFaltas) trend = 'down';

      return {
        ...emp,
        faltas: selectedDay === 'all' ? faltas : (attendance[emp.id]?.[selectedDay as number] === 'F' ? 1 : 0),
        trend
      };
    }).sort((a, b) => b.faltas - a.faltas);
  }, [attendance, employees, selectedDay, currentMonth, currentYear]);

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
          const recordId = `${empId}_${currentYear}_${currentMonth}_${day}`;
          const attRef = doc(db, 'attendance', recordId);
          
          batch.set(attRef, {
            empId,
            day,
            month: currentMonth,
            year: currentYear,
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

          const recordId = `${empId}_${currentYear}_${currentMonth}_${day}`;
          const attRef = doc(db, 'attendance', recordId);
          
          batch.set(attRef, {
            empId,
            day,
            month: currentMonth,
            year: currentYear,
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
        
        // Sempre salvar o estado de bloqueio no Firestore para persistência
        const completionId = `${currentShift}_${currentYear}_${currentMonth}_${selectedDay}`;
        await setDoc(doc(db, 'completions', completionId), {
          shift: currentShift,
          day: selectedDay,
          month: currentMonth,
          year: currentYear,
          completedAt: serverTimestamp(),
          completedBy: user.email,
          isLocked: true
        }, { merge: true });

        setLockedDays(prev => ({ ...prev, [selectedDay]: true }));

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

  const getWeekdayName = (day: number, month: number, year: number) => {
    const date = new Date(year, month, day);
    return date.toLocaleDateString('pt-BR', { weekday: 'long' });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12 overflow-x-hidden">
      {/* Header */}
      <header className="bg-[#1e3a8a] border-b border-blue-900 sticky top-0 z-20 shadow-lg">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 sm:h-16 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Logo & Title */}
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase leading-none">
                    Absenteísmo
                  </h1>
                  <span className="text-[10px] sm:text-xs text-blue-200 font-bold uppercase tracking-widest mt-0.5">
                    {isSupervision ? 'Supervisão' : `Turno ${currentShift}`} • {MONTH_NAMES[currentMonth]}
                  </span>
                </div>
              </div>

              {/* Mobile Logout (only visible on small screens to save space in the bottom row) */}
              <button 
                onClick={logout}
                className="sm:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
            
            {/* Controls Section */}
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {/* Seletor de Mês/Ano */}
              <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1 border border-white/10 shadow-inner shrink-0">
                <select 
                  value={currentMonth} 
                  onChange={(e) => {
                    setCurrentMonth(Number(e.target.value));
                    setSelectedDay('all');
                  }}
                  className="bg-transparent border-none text-[10px] sm:text-xs font-black text-white focus:ring-0 cursor-pointer py-1 pr-7 pl-2 [&>option]:text-gray-900 uppercase tracking-wider"
                >
                  {MONTH_NAMES.map((name, i) => {
                    if (currentYear === 2026 && i < 3) return null;
                    if (currentYear > now.getFullYear() || (currentYear === now.getFullYear() && i > now.getMonth())) return null;
                    return <option key={i} value={i}>{name}</option>;
                  })}
                </select>
                <div className="w-px h-3 bg-white/20"></div>
                <select 
                  value={currentYear} 
                  onChange={(e) => {
                    setCurrentYear(Number(e.target.value));
                    setSelectedDay('all');
                    if (Number(e.target.value) === 2026 && currentMonth < 3) setCurrentMonth(3);
                  }}
                  className="bg-transparent border-none text-[10px] sm:text-xs font-black text-white focus:ring-0 cursor-pointer py-1 pr-7 pl-2 [&>option]:text-gray-900 uppercase tracking-wider"
                >
                  {[2026, 2027].filter(y => y <= now.getFullYear()).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {isSupervision && (
                <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1 border border-white/10 shadow-inner shrink-0">
                  {['A', 'B', 'C', 'D'].map(s => (
                    <button
                      key={s}
                      onClick={() => setSupervisionShiftFilter(s as any)}
                      className={`px-2.5 py-1 text-[10px] sm:text-xs font-black rounded-lg transition-all ${
                        supervisionShiftFilter === s 
                          ? 'bg-white text-blue-900 shadow-sm' 
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Seletor Global de Dia */}
              <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1 border border-white/10 shadow-inner shrink-0">
                {activeTab === 'registro' && (
                  <button 
                    onClick={handlePrevDay}
                    disabled={selectedDay !== 'all' && VALID_WORK_DAYS.indexOf(selectedDay as number) <= 0}
                    className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                
                <div className="flex items-center px-1">
                  <select 
                    value={selectedDay} 
                    onChange={(e) => setSelectedDay(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="bg-transparent border-none text-[10px] sm:text-xs font-black text-white focus:ring-0 cursor-pointer py-1 pr-7 pl-1 [&>option]:text-gray-900 uppercase tracking-wider"
                  >
                    {activeTab !== 'registro' && <option value="all">Todos os dias</option>}
                    {VALID_WORK_DAYS.map(d => (
                      <option key={d} value={d}>Dia {d}</option>
                    ))}
                  </select>
                </div>

                {activeTab === 'registro' && (
                  <button 
                    onClick={handleNextDay}
                    disabled={selectedDay !== 'all' && VALID_WORK_DAYS.indexOf(selectedDay as number) >= VALID_WORK_DAYS.length - 1}
                    className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Desktop Logout */}
              <button 
                onClick={logout}
                className="hidden sm:flex items-center gap-2 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
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
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex gap-4 sm:gap-8">
            <button 
              className={`py-4 text-xs sm:text-sm 2xl:text-base font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard className="w-4 h-4 2xl:w-5 2xl:h-5" />
              Dashboard
            </button>
            {!isSupervision && (
              <button 
                className={`py-4 text-xs sm:text-sm 2xl:text-base font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === 'registro' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'}`}
                onClick={() => {
                  setActiveTab('registro');
                  if (selectedDay === 'all') {
                    setSelectedDay(VALID_WORK_DAYS[0]);
                  }
                }}
              >
                <ClipboardList className="w-4 h-4 2xl:w-5 2xl:h-5" />
                Registro
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 2xl:py-10">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Visão Geral do Mês</h2>
              <button 
                onClick={handleExportExcel}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                <Download className="w-4 h-4" />
                Exportar Excel
              </button>
            </div>

            {/* Intelligent Alerts Center */}
            {isSupervision && alerts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top duration-500">
                {alerts.map((alert, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center gap-4 p-4 rounded-2xl border ${
                      alert.type === 'critical' 
                        ? 'bg-red-50 border-red-100 text-red-800' 
                        : 'bg-amber-50 border-amber-100 text-amber-800'
                    } shadow-sm`}
                  >
                    <div className={`p-2 rounded-xl ${
                      alert.type === 'critical' ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      <alert.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold leading-tight">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Total Faltas */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col items-start justify-between gap-2 hover:shadow-md transition-shadow">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  {selectedDay === 'all' ? 'Total de Faltas no Mês' : 'Faltas no Dia'}
                </h3>
                <div className="text-4xl font-extrabold text-red-600">
                  {selectedDay === 'all' ? totalFaltasMes : employees.filter(emp => getStatusForDay(emp.id, selectedDay as number) === 'F').length}
                </div>
              </div>

              {/* Taxa Absenteismo / Presentes */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col items-start justify-between gap-2 hover:shadow-md transition-shadow">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  {selectedDay === 'all' ? 'Taxa de Absenteísmo' : 'Presentes'}
                </h3>
                <div className="text-4xl font-extrabold text-orange-600">
                  {selectedDay === 'all' ? `${taxaAbsenteismo}%` : employees.filter(emp => getStatusForDay(emp.id, selectedDay as number) === 'P').length}
                </div>
              </div>

              {/* Funcionarios */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col items-start justify-between gap-2 hover:shadow-md transition-shadow">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Funcionários</h3>
                <div className="text-4xl font-extrabold text-blue-600">{employees.length}</div>
              </div>

              {/* Maior No Faltas / Afastamentos */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col items-start justify-between gap-2 hover:shadow-md transition-shadow">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  {selectedDay === 'all' ? 'Maior Nº de Faltas' : 'Afastamentos/Férias'}
                </h3>
                <div className="text-lg font-bold text-green-700 leading-tight uppercase">
                  {selectedDay === 'all' 
                    ? (topEmployee ? topEmployee.name : '-')
                    : employees.filter(emp => ['Fe', 'A'].includes(attendance[emp.id]?.[selectedDay as number] || 'P')).length
                  }
                </div>
                {selectedDay === 'all' && (
                  <div className="text-sm font-bold text-green-600">
                    {topEmployee ? `(${topEmployee.faltas}F)` : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Left Column: Tables (Only for 'all') */}
              {selectedDay === 'all' && (
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
                              <td className="px-4 py-2 text-xs font-medium text-gray-900">{d.day.padStart(2, '0')}/{MONTH_NAMES[currentMonth].substring(0, 3).toLowerCase()}</td>
                              <td className="px-4 py-2 text-xs text-gray-500 text-center">{d.faltas}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Right Column: Charts */}
              <div className={`${selectedDay === 'all' ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-6`}>
                {selectedDay === 'all' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Leaderboard Chart (Supervision Only) */}
                    {isSupervision && (
                      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm flex flex-col lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-sm 2xl:text-base font-bold text-gray-900 uppercase tracking-tight">Performance por Turno (% Assiduidade)</h3>
                          <TrendingUp className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="h-[200px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={leaderboardData} layout="vertical" margin={{ left: 40, right: 40 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                              <XAxis type="number" domain={[0, 100]} hide />
                              <YAxis 
                                dataKey="shift" 
                                type="category" 
                                axisLine={false} 
                                tickLine={false}
                                tick={{ fontSize: 12, fontWeight: 'bold', fill: '#1e3a8a' }}
                              />
                              <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(val) => [`${val}%`, 'Assiduidade']}
                              />
                              <Bar dataKey="rate" radius={[0, 10, 10, 0]} barSize={30}>
                                {leaderboardData.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.rate > 90 ? '#10b981' : entry.rate > 80 ? '#3b82f6' : '#f59e0b'} 
                                  />
                                ))}
                                <LabelList dataKey="rate" position="right" formatter={(val: any) => `${val}%`} fill="#1e3a8a" fontSize={12} fontWeight="bold" />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

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
                ) : (
                  /* Single Day View: Donut Chart */
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col items-center relative group">
                    <div className="w-full flex items-center justify-between mb-6">
                      <h3 className="text-base font-bold text-gray-900">Distribuição de Asistencia</h3>
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">Dia {selectedDay}</span>
                    </div>
                    
                    <div className="h-[350px] w-full max-w-[500px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Presentes', value: employees.length - employees.filter(emp => attendance[emp.id]?.[selectedDay as number] === 'F').length },
                              { name: 'Faltas', value: employees.filter(emp => attendance[emp.id]?.[selectedDay as number] === 'F').length },
                              { name: 'Outros', value: employees.filter(emp => ['Fe', 'A'].includes(attendance[emp.id]?.[selectedDay as number] || 'P')).length }
                            ].filter(d => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={85}
                            outerRadius={115}
                            paddingAngle={8}
                            cornerRadius={10}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell fill="#10b981" /> {/* Emerald 500 */}
                            <Cell fill="#f43f5e" /> {/* Rose 500 */}
                            <Cell fill="#0ea5e9" /> {/* Sky 500 */}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Central Label Overlay */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <span className="block text-3xl font-black text-gray-900">
                          {Math.round(((employees.length - employees.filter(emp => attendance[emp.id]?.[selectedDay as number] === 'F').length) / employees.length) * 100)}%
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Presença</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 w-full mt-4">
                      <div className="flex flex-col items-center p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-tighter">Presentes</span>
                        <span className="text-lg font-black text-emerald-700">{employees.length - employees.filter(emp => attendance[emp.id]?.[selectedDay as number] === 'F').length}</span>
                      </div>
                      <div className="flex flex-col items-center p-3 rounded-2xl bg-rose-50 border border-rose-100">
                        <span className="text-xs font-bold text-rose-600 uppercase tracking-tighter">Faltas</span>
                        <span className="text-lg font-black text-rose-700">{employees.filter(emp => attendance[emp.id]?.[selectedDay as number] === 'F').length}</span>
                      </div>
                      <div className="flex flex-col items-center p-3 rounded-2xl bg-sky-50 border border-sky-100">
                        <span className="text-xs font-bold text-sky-600 uppercase tracking-tighter">Outros</span>
                        <span className="text-lg font-black text-sky-700">{employees.filter(emp => ['Fe', 'A'].includes(attendance[emp.id]?.[selectedDay as number] || 'P')).length}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Daily Evolution Chart (Only for 'all') */}
                {selectedDay === 'all' && (
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
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0, 0, 0, 0.1)' }}
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
                )}
              </div>
            </div>

            {/* Bottom Section: Employee Details Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col max-h-[700px] transition-all duration-300 hover:shadow-2xl">
              <div className="p-5 sm:p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-col lg:flex-row lg:items-center justify-between gap-6 shrink-0">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Detalhamento por Funcionário</h2>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <p className="text-sm font-medium">Acompanhamento individual de faltas no mês.</p>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
                  <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Buscar por nome ou ID..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white/50 backdrop-blur-sm"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                      <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="w-full md:w-auto pl-11 pr-10 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 appearance-none bg-white cursor-pointer hover:bg-gray-50 transition-all"
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

              <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-white/80 backdrop-blur-md sticky top-0 z-20">
                    <tr>
                      <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        <button 
                          onClick={() => setSortOrder(prev => prev === 'asc_name' ? 'desc_name' : 'asc_name')}
                          className="flex items-center gap-2 hover:text-blue-600 transition-colors group"
                        >
                          Funcionário
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">ID</th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">
                        {selectedDay === 'all' ? (
                          <button 
                            onClick={() => setSortOrder('desc_faltas')}
                            className="flex items-center justify-center gap-2 hover:text-blue-600 transition-colors w-full group"
                          >
                            Faltas no Mês
                            <ArrowDown className={`w-3.5 h-3.5 transition-transform ${sortOrder === 'desc_faltas' ? 'scale-110 text-blue-500' : 'opacity-0 group-hover:opacity-100'}`} />
                          </button>
                        ) : (
                          'Status do Dia'
                        )}
                      </th>
                      {selectedDay === 'all' && (
                        <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Tendência</th>
                      )}
                      {selectedDay !== 'all' && (
                        <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Observações</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredEmployees.map((emp, idx) => {
                      const status = selectedDay !== 'all' ? getStatusForDay(emp.id, selectedDay as number) : null;
                      const statusLabels: Record<string, string> = {
                        'P': 'Presente',
                        'F': 'Falta',
                        'Fe': 'Férias',
                        'A': 'Afastamento'
                      };

                      const trend = emp.trend;

                      return (
                        <tr 
                          key={emp.id} 
                          className={`group hover:bg-blue-50/30 transition-all duration-200 ${isSupervision ? 'cursor-pointer' : ''}`}
                          onClick={() => isSupervision && setSelectedEmployeeDetail(emp)}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm transition-transform group-hover:scale-110 ${
                                idx % 4 === 0 ? 'bg-blue-100 text-blue-600' :
                                idx % 4 === 1 ? 'bg-purple-100 text-purple-600' :
                                idx % 4 === 2 ? 'bg-emerald-100 text-emerald-600' :
                                'bg-orange-100 text-orange-600'
                              }`}>
                                {getInitials(emp.name)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">{emp.name}</span>
                                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">Membro da Equipe</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="inline-flex px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-[10px] font-mono font-bold">
                              #{emp.id.padStart(3, '0')}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            {selectedDay === 'all' ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`text-lg font-black ${
                                  emp.faltas > 3 ? 'text-red-600' : 
                                  emp.faltas > 0 ? 'text-orange-500' : 
                                  'text-emerald-500'
                                }`}>
                                  {emp.faltas}
                                </span>
                                <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${
                                      emp.faltas > 3 ? 'bg-red-500' : 
                                      emp.faltas > 0 ? 'bg-orange-400' : 
                                      'bg-emerald-400'
                                    }`}
                                    style={{ width: `${Math.min((emp.faltas / 5) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-sm ${
                                status === 'P' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
                                status === 'F' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' :
                                status === 'Fe' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' :
                                'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                  status === 'P' ? 'bg-emerald-500' :
                                  status === 'F' ? 'bg-red-500' :
                                  status === 'Fe' ? 'bg-blue-500' :
                                  'bg-amber-500'
                                }`} />
                                {status ? statusLabels[status] || status : '-'}
                              </span>
                            )}
                          </td>
                          {selectedDay === 'all' && (
                            <td className="py-4 px-6 text-center">
                              <div className="flex justify-center">
                                {trend === 'up' ? (
                                  <div className="flex items-center gap-1 text-red-500 bg-red-50 px-2 py-1 rounded-lg">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold">Alta</span>
                                  </div>
                                ) : trend === 'down' ? (
                                  <div className="flex items-center gap-1 text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                                    <TrendingDown className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold">Baixa</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                                    <Minus className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold">Estável</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                          {selectedDay !== 'all' && (
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2 text-gray-500 italic text-xs">
                                <MessageSquare className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[200px]">{notes[emp.id]?.[selectedDay as number] || 'Sem observações'}</span>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest shrink-0">
                <span>Total: {filteredEmployees.length} Funcionários</span>
                {selectedDay === 'all' && (
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" /> Regular
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-orange-400" /> Atenção
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500" /> Crítico
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'registro' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Registro Header & Stats */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 uppercase tracking-tight">
                    Lançamento de Frequência
                    {selectedDay !== 'all' && !isWorkDay(selectedDay as number, currentMonth, currentYear) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-800 border border-gray-300 uppercase">
                        Folga (12x36)
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-gray-500">Gestão de presença individual para o dia selecionado.</p>
                </div>
                
                {isWorkDay(selectedDay as number, currentMonth, currentYear) && (
                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex flex-col items-center px-4 border-r border-gray-100">
                      <span className="text-2xl font-black text-green-600">
                        {employees.length - employees.filter(emp => {
                          const status = getStatusForDay(emp.id, selectedDay);
                          return status !== 'P';
                        }).length}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Presentes</span>
                    </div>
                    <div className="flex flex-col items-center px-4 border-r border-gray-100">
                      <span className="text-2xl font-black text-red-600">
                        {employees.filter(emp => getStatusForDay(emp.id, selectedDay) === 'F').length}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Faltas</span>
                    </div>
                    <div className="flex flex-col items-center px-4 border-r border-gray-100">
                      <span className="text-2xl font-black text-blue-600">
                        {employees.filter(emp => getStatusForDay(emp.id, selectedDay) === 'Fe').length}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Férias</span>
                    </div>
                    <div className="flex flex-col items-center px-4">
                      <span className="text-2xl font-black text-purple-600">
                        {employees.filter(emp => getStatusForDay(emp.id, selectedDay) === 'A').length}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Afast.</span>
                    </div>
                  </div>
                )}
              </div>
              
              {isWorkDay(selectedDay as number, currentMonth, currentYear) && (
                <div className="p-4 sm:p-6 flex flex-col md:flex-row items-center gap-4">
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={() => setShowAddEmployeeModal(true)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="uppercase tracking-wide">Novo Funcionário</span>
                    </button>
                    <button
                      onClick={handleMarkAllPresent}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border border-green-200 active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="uppercase tracking-wide">Todos Presentes</span>
                    </button>
                  </div>
                  <div className="relative w-full md:max-w-xs ml-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Filtrar por nome ou ID..." 
                      value={registroSearchTerm}
                      onChange={(e) => setRegistroSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Employee Grid */}
            {selectedDay !== 'all' && !isWorkDay(selectedDay as number, currentMonth, currentYear) ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
                  <CalendarX className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Dia de Folga Geral</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Escala 12x36: Este dia não possui expediente para este turno.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredRegistroEmployees.map(emp => {
                  const day = selectedDay === 'all' ? currentDayOfMonth : (selectedDay as number);
                  const currentStatus = pendingAttendance[emp.id]?.[day] ?? attendance[emp.id]?.[day] ?? 'P';
                  const currentNote = pendingNotes[emp.id]?.[day] ?? notes[emp.id]?.[day] ?? '';
                  const isModified = pendingAttendance[emp.id]?.[day] !== undefined || pendingNotes[emp.id]?.[day] !== undefined;
                  
                  return (
                    <div 
                      key={emp.id} 
                      className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden group ${
                        isModified 
                          ? 'border-blue-300 ring-1 ring-blue-100 shadow-md' 
                          : 'border-gray-200 hover:border-blue-200 hover:shadow-md'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="p-4 border-b border-gray-50 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="text-sm font-bold text-gray-900 truncate uppercase tracking-tight">{emp.name}</h4>
                            {isModified && (
                              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="Alteração pendente"></span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID: {emp.id.padStart(3, '0')}</span>
                            <span className="text-gray-300">•</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              currentStatus === 'P' ? 'text-green-600' :
                              currentStatus === 'F' ? 'text-red-600' :
                              currentStatus === 'Fe' ? 'text-blue-600' :
                              'text-purple-600'
                            }`}>
                              {currentStatus === 'P' ? 'Presente' :
                               currentStatus === 'F' ? 'Falta' :
                               currentStatus === 'Fe' ? 'Férias' :
                               'Afastamento'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingEmployee(emp);
                              setShowEditEmployeeModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Card Body - Status Selection */}
                      <div className="p-4 grid grid-cols-4 gap-2 bg-gray-50/30">
                        <button 
                          onClick={() => setStatus(emp.id, day, 'P')}
                          disabled={lockedDays[day] && !isModified}
                          className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all border ${
                            currentStatus === 'P' 
                              ? 'bg-white border-green-200 text-green-700 shadow-sm ring-2 ring-green-500/10' 
                              : 'bg-white/50 border-transparent text-gray-400 hover:bg-white hover:text-gray-600 hover:border-gray-200'
                          } ${lockedDays[day] && !isModified ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <CheckCircle2 className={`w-4 h-4 ${currentStatus === 'P' ? 'text-green-500' : 'text-gray-300'}`} />
                          <span className="text-[9px] font-black uppercase tracking-tighter">Pres.</span>
                        </button>
                        <button 
                          onClick={() => setStatus(emp.id, day, 'F')}
                          disabled={lockedDays[day] && !isModified}
                          className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all border ${
                            currentStatus === 'F' 
                              ? 'bg-red-50 border-red-200 text-red-700 shadow-sm ring-2 ring-red-500/10' 
                              : 'bg-white/50 border-transparent text-gray-400 hover:bg-white hover:text-gray-600 hover:border-gray-200'
                          } ${lockedDays[day] && !isModified ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <XCircle className={`w-4 h-4 ${currentStatus === 'F' ? 'text-red-500' : 'text-gray-300'}`} />
                          <span className="text-[9px] font-black uppercase tracking-tighter">Falta</span>
                        </button>
                        <button 
                          onClick={() => setStatus(emp.id, day, 'Fe')}
                          disabled={lockedDays[day] && !isModified}
                          className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all border ${
                            currentStatus === 'Fe' 
                              ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm ring-2 ring-blue-500/10' 
                              : 'bg-white/50 border-transparent text-gray-400 hover:bg-white hover:text-gray-600 hover:border-gray-200'
                          } ${lockedDays[day] && !isModified ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <Palmtree className={`w-4 h-4 ${currentStatus === 'Fe' ? 'text-blue-500' : 'text-gray-300'}`} />
                          <span className="text-[9px] font-black uppercase tracking-tighter">Férias</span>
                        </button>
                        <button 
                          onClick={() => setStatus(emp.id, day, 'A')}
                          disabled={lockedDays[day] && !isModified}
                          className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all border ${
                            currentStatus === 'A' 
                              ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm ring-2 ring-purple-500/10' 
                              : 'bg-white/50 border-transparent text-gray-400 hover:bg-white hover:text-gray-600 hover:border-gray-200'
                          } ${lockedDays[day] && !isModified ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <Stethoscope className={`w-4 h-4 ${currentStatus === 'A' ? 'text-purple-500' : 'text-gray-300'}`} />
                          <span className="text-[9px] font-black uppercase tracking-tighter">Afast.</span>
                        </button>
                      </div>

                      {/* Card Footer - Notes */}
                      <div className="p-3 bg-white border-t border-gray-50 mt-auto">
                        <div className="relative group/note">
                          <MessageSquare className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 group-focus-within/note:text-blue-400 transition-colors" />
                          <input 
                            type="text" 
                            placeholder="Observação..." 
                            value={currentNote}
                            readOnly={lockedDays[day] && !isModified}
                            onChange={(e) => setNote(emp.id, day, e.target.value)}
                            className={`w-full pl-7 pr-2 py-1.5 text-xs bg-gray-50/50 border-transparent rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-100 focus:border-blue-200 focus:outline-none transition-all placeholder:text-gray-300 ${
                              lockedDays[day] && !isModified ? 'cursor-not-allowed opacity-50' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Save Button Area */}
            {isWorkDay(selectedDay as number, currentMonth, currentYear) && (
              <div className="sticky bottom-4 z-10 flex justify-center pt-4">
                <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-gray-200 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-500">
                  {lockedDays[selectedDay] && (
                    <button
                      onClick={() => setLockedDays(prev => ({ ...prev, [selectedDay]: false }))}
                      className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-bold uppercase tracking-wider"
                    >
                      Editar registros
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={isSaving || (Object.keys(pendingAttendance).length === 0 && Object.keys(pendingNotes).length === 0)}
                    className={`flex items-center gap-3 px-10 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-xl ${
                      isSaving || (Object.keys(pendingAttendance).length === 0 && Object.keys(pendingNotes).length === 0)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105 active:scale-95 shadow-indigo-200'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Activity className="w-5 h-5 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Salvar e Notificar
                      </>
                    )}
                  </button>
                </div>
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

      {/* Edit Employee Modal */}
      {showEditEmployeeModal && editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Editar Funcionário</h3>
              <button 
                onClick={() => {
                  setShowEditEmployeeModal(false);
                  setEditingEmployee(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateEmployee} className="p-4 sm:p-6 space-y-4">
              <div>
                <label htmlFor="editEmployeeName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  id="editEmployeeName"
                  type="text"
                  required
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                  placeholder="Digite o nome do funcionário..."
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditEmployeeModal(false);
                    setEditingEmployee(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!editingEmployee.name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Detail Modal (Deep-Dive) */}
      {selectedEmployeeDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-6 sm:p-8 border-b border-gray-100 bg-gradient-to-r from-blue-900 to-blue-800 text-white shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black">
                    {getInitials(selectedEmployeeDetail.name)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight leading-tight">{selectedEmployeeDetail.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-widest">ID: #{selectedEmployeeDetail.id.padStart(3, '0')}</span>
                      <span className="px-2 py-0.5 bg-emerald-500 rounded-lg text-[10px] font-bold uppercase tracking-widest">Ativo</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedEmployeeDetail(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Total de Faltas</span>
                  <span className="text-3xl font-black text-red-600">
                    {Object.values(globalAttendance[selectedEmployeeDetail.id] || {}).filter(s => s === 'F').length}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Assiduidade</span>
                  <span className="text-3xl font-black text-blue-600">
                    {Math.round((1 - (Object.values(globalAttendance[selectedEmployeeDetail.id] || {}).filter(s => s === 'F').length / VALID_WORK_DAYS.length)) * 100)}%
                  </span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tendência</span>
                  <div className="flex items-center gap-2">
                    {employeeData.find(e => e.id === selectedEmployeeDetail.id)?.trend === 'up' ? (
                      <TrendingUp className="w-6 h-6 text-red-500" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-emerald-500" />
                    )}
                    <span className="text-lg font-bold text-gray-700 capitalize">
                      {employeeData.find(e => e.id === selectedEmployeeDetail.id)?.trend === 'up' ? 'Em Alta' : 'Em Baixa'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Calendar Heatmap / Pattern Analysis */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                  Análise de Padrões (Dias de Trabalho)
                </h3>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const isWork = isWorkDay(day, currentMonth, currentYear);
                    const status = globalAttendance[selectedEmployeeDetail.id]?.[day];
                    const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth();
                    
                    return (
                      <div 
                        key={day}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all ${
                          !isWork ? 'bg-gray-50 border-gray-100 opacity-30' :
                          status === 'F' ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' :
                          status === 'Fe' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                          status === 'A' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                          'bg-emerald-50 border-emerald-200 text-emerald-700'
                        } ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                      >
                        <span className="text-[10px] font-bold opacity-50">{day}</span>
                        {isWork && (
                          <span className="text-xs font-black">
                            {status || 'P'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekday Frequency */}
              <div className="bg-gray-50 rounded-[24px] p-6 border border-gray-100">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Frequência por Dia da Semana</h3>
                <div className="space-y-3">
                  {['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'].map(wd => {
                    const dayFaltas = Object.entries(globalAttendance[selectedEmployeeDetail.id] || {})
                      .filter(([d, s]) => s === 'F' && getWeekdayName(Number(d), currentMonth, currentYear) === wd)
                      .length;
                    
                    if (dayFaltas === 0) return null;

                    return (
                      <div key={wd} className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 capitalize">{wd}</span>
                        <div className="flex items-center gap-3 flex-1 mx-4">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden flex-1">
                            <div 
                              className="h-full bg-red-500 rounded-full" 
                              style={{ width: `${Math.min((dayFaltas / 4) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-black text-red-600 w-16 text-right">{dayFaltas} Faltas</span>
                        </div>
                      </div>
                    );
                  })}
                  {Object.values(globalAttendance[selectedEmployeeDetail.id] || {}).filter(s => s === 'F').length === 0 && (
                    <p className="text-xs text-gray-400 italic text-center py-4">Nenhum padrão de falta detectado este mês.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedEmployeeDetail(null)}
                className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
              >
                Fechar Perfil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}