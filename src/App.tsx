import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAuth } from './hooks/useAuth';
import { useFirestoreData } from './hooks/useFirestoreData';
import { testConnection } from './firebase';
import { useDashboardAnalytics } from './hooks/useDashboardAnalytics';
import { getDaysInMonth, isWorkDay, getWeekdayName, getInitials } from './utils/dateUtils';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

// ─── Static Components ────────────────────────────────────────────────────────────────────────────────
const BIOMETRIC_KEY = 'vonixx_biometric_enabled';
import Login from './components/Login/Login';
import Header from './components/Header/Header';
import LockScreen from './components/LockScreen/LockScreen';

// ─── Code-Split Views ──────────────────────────────────────────────────────────────────────────────
const AbsenteeismDashboard = lazy(() => import('./components/AbsenteeismDashboard/AbsenteeismDashboard'));
const AttendanceRegistry   = lazy(() => import('./components/AttendanceRegistry/AttendanceRegistry'));
const VacationManagement   = lazy(() => import('./components/VacationManagement/VacationManagement'));
const VacationAnalytics    = lazy(() => import('./components/VacationAnalytics/VacationAnalytics'));

// ─── Code-Split Modals ─────────────────────────────────────────────────────────────────────────────
const AddEmployeeModal    = lazy(() => import('./components/AddEmployeeModal/AddEmployeeModal'));
const EditEmployeeModal   = lazy(() => import('./components/EditEmployeeModal/EditEmployeeModal'));
const EmployeeDetailModal = lazy(() => import('./components/EmployeeDetailModal/EmployeeDetailModal'));

function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700" />
    </div>
  );
}

const APP_START_YEAR  = 2026;
const APP_START_MONTH = 3;
const APP_START_DAY   = 3;

export default function App() {
  const auth = useAuth();

  // ─── Biometric Lock ────────────────────────────────────────────────────────────────────────────────
  const [isLocked, setIsLocked] = useState(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    const enabled = localStorage.getItem(BIOMETRIC_KEY) === 'true';
    return isMobile && enabled;
  });

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && auth.user) {
        const isMobile = window.innerWidth < 1024;
        const enabled = localStorage.getItem(BIOMETRIC_KEY) === 'true';
        if (enabled && isMobile) setIsLocked(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [auth.user]);

  const handleUnlock = useCallback(() => setIsLocked(false), []);

  const [activeTab, setActiveTab]   = useState<'dashboard' | 'registro' | 'ferias' | 'ferias_dashboard'>('dashboard');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear]   = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay]   = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critico' | 'atencao' | 'regular'>('all');
  const [sortOrder, setSortOrder]       = useState<'desc_faltas' | 'asc_name' | 'desc_name'>('desc_faltas');
  const [registroSearchTerm, setRegistroSearchTerm] = useState('');
  const [supervisionShiftFilter, setSupervisionShiftFilter] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [showDismissed, setShowDismissed] = useState(false);

  const daysInMonth = useMemo(
    () => getDaysInMonth(currentMonth, currentYear),
    [currentMonth, currentYear]
  );

  const currentDayOfMonth = useMemo(() => {
    const now = new Date();
    if (now.getMonth() === currentMonth && now.getFullYear() === currentYear) {
      return now.getDate();
    }
    return daysInMonth;
  }, [currentMonth, currentYear, daysInMonth]);

  const VALID_WORK_DAYS = useMemo(() => {
    const now = new Date();
    const todayYear  = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay   = now.getDate();

    const minDay = currentYear === APP_START_YEAR && currentMonth === APP_START_MONTH ? APP_START_DAY : 1;
    const maxDay = currentYear === todayYear && currentMonth === todayMonth ? todayDay : daysInMonth;

    const days: number[] = [];
    for (let d = minDay; d <= maxDay; d++) {
      if (isWorkDay(d, currentMonth, currentYear)) days.push(d);
    }
    return days;
  }, [daysInMonth, currentMonth, currentYear]);

  const isValidDay = useCallback(
    (day: number) => isWorkDay(day, currentMonth, currentYear),
    [currentMonth, currentYear]
  );

  const data = useFirestoreData({
    user: auth.user,
    currentShift: auth.currentShift,
    isSupervision: auth.isSupervision,
    isAdminUser: auth.isAdminUser,
    supervisionShiftFilter,
    currentMonth,
    currentYear,
    selectedDay,
    VALID_WORK_DAYS,
  });

  const analytics = useDashboardAnalytics({
    employees: data.employees,
    attendance: data.attendance,
    globalEmployees: data.globalEmployees ?? [],
    globalAttendance: data.globalAttendance ?? {},
    globalCompletions: data.globalCompletions ?? [],
    vacations: data.vacations,
    selectedDay,
    currentMonth,
    currentYear,
    VALID_WORK_DAYS,
    isSupervision: auth.isSupervision,
    searchTerm,
    statusFilter,
    sortOrder,
    registroSearchTerm,
    isValidDay,
    showDismissed,
  });

  useEffect(() => {
    const now = new Date();
    const today = now.getDate();
    const isCurrentMonth = now.getMonth() === currentMonth && now.getFullYear() === currentYear;

    if (isCurrentMonth && selectedDay === 'all' && VALID_WORK_DAYS.length > 0) {
      if (VALID_WORK_DAYS.includes(today)) {
        setSelectedDay(today);
      } else {
        const lastWorkDay = VALID_WORK_DAYS[VALID_WORK_DAYS.length - 1];
        setSelectedDay(lastWorkDay);
      }
    }
  }, [VALID_WORK_DAYS, currentMonth, currentYear]);

  useEffect(() => {
    if (auth.isSupervision && (activeTab === 'registro' || activeTab === 'ferias')) {
      setActiveTab('dashboard');
    }
  }, [auth.isSupervision, activeTab]);

  useEffect(() => {
    if (
      selectedDay !== 'all' &&
      !VALID_WORK_DAYS.includes(selectedDay as number) &&
      VALID_WORK_DAYS.length > 0
    ) {
      setSelectedDay(VALID_WORK_DAYS[VALID_WORK_DAYS.length - 1]);
    }
  }, [selectedDay, VALID_WORK_DAYS]);

  const handlePrevDay = () => {
    const idx = selectedDay === 'all' ? VALID_WORK_DAYS.length : VALID_WORK_DAYS.indexOf(selectedDay as number);
    if (idx > 0) setSelectedDay(VALID_WORK_DAYS[idx - 1]);
  };

  const handleNextDay = () => {
    if (selectedDay === 'all') return;
    const idx = VALID_WORK_DAYS.indexOf(selectedDay as number);
    if (idx < VALID_WORK_DAYS.length - 1) setSelectedDay(VALID_WORK_DAYS[idx + 1]);
  };

  useEffect(() => {
    testConnection();
  }, []);

  if (isLocked) return <LockScreen onUnlock={handleUnlock} />;

  if (auth.authLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-blue-500/50 text-xs font-bold uppercase tracking-widest animate-pulse">Validando acesso...</p>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <ErrorBoundary>
        <Login
          handleLogin={auth.handleLogin}
          selectedShiftLogin={auth.selectedShiftLogin}
          setSelectedShiftLogin={auth.setSelectedShiftLogin}
          loginPassword={auth.loginPassword}
          setLoginPassword={auth.setLoginPassword}
          loginError={auth.loginError}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans pb-16 overflow-x-hidden">
      <ErrorBoundary>
        <Header
          isSupervision={auth.isSupervision}
          currentShift={auth.currentShift}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          currentYear={currentYear}
          setCurrentYear={setCurrentYear}
          supervisionShiftFilter={supervisionShiftFilter}
          setSupervisionShiftFilter={setSupervisionShiftFilter}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          VALID_WORK_DAYS={VALID_WORK_DAYS}
          handlePrevDay={handlePrevDay}
          handleNextDay={handleNextDay}
          logout={auth.logout}
          deferredPrompt={auth.deferredPrompt}
          isStandalone={auth.isStandalone}
          handleInstallClick={auth.handleInstallClick}
          connectionError={data.connectionError}
          handleRetry={data.handleRetry}
          userEmail={auth.user?.email ?? null}
        />
      </ErrorBoundary>

      <main className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 2xl:py-10">
        {data.dataLoading && data.employees.length === 0 ? (
          <SectionLoader />
        ) : (
          <ErrorBoundary>
            {activeTab === 'dashboard' && (
              <Suspense fallback={<SectionLoader />}>
                <AbsenteeismDashboard
                  handleExportExcel={data.handleExportExcel}
                  isSupervision={auth.isSupervision}
                  alerts={analytics.alerts}
                  selectedDay={selectedDay}
                  currentMonth={currentMonth}
                  currentYear={currentYear}
                  totalFaltasMes={analytics.totalFaltasMes}
                  employees={data.employees}
                  rawEmployees={data.rawEmployees}
                  attendance={data.attendance}
                  getStatusForDay={data.getStatusForDay}
                  taxaAbsenteismo={analytics.taxaAbsenteismo}
                  topEmployee={analytics.topEmployee}
                  dailyData={analytics.dailyData}
                  leaderboardData={analytics.leaderboardData}
                  topEmployees={analytics.topEmployees}
                  weekdayData={analytics.weekdayData}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  sortOrder={sortOrder}
                  setSortOrder={setSortOrder}
                  filteredEmployees={analytics.filteredEmployees}
                  notes={data.notes}
                  setSelectedEmployeeDetail={data.setSelectedEmployeeDetail}
                  getInitials={getInitials}
                  currentShift={auth.currentShift}
                  lockedDays={data.lockedDays}
                  validWorkDays={VALID_WORK_DAYS}
                  vacations={data.vacations}
                  activeEmployeesCount={analytics.activeEmployees.length}
                  showDismissed={showDismissed}
                  setShowDismissed={setShowDismissed}
                />
              </Suspense>
            )}

            {activeTab === 'registro' && !auth.isSupervision && (
              <Suspense fallback={<SectionLoader />}>
                <AttendanceRegistry
                  selectedDay={selectedDay}
                  currentDayOfMonth={currentDayOfMonth}
                  currentMonth={currentMonth}
                  currentYear={currentYear}
                  isWorkDay={isWorkDay}
                  employees={data.employees}
                  getStatusForDay={data.getStatusForDay}
                  setShowAddEmployeeModal={data.setShowAddEmployeeModal}
                  handleMarkAllPresent={data.handleMarkAllPresent}
                  registroSearchTerm={registroSearchTerm}
                  setRegistroSearchTerm={setRegistroSearchTerm}
                  filteredRegistroEmployees={analytics.filteredRegistroEmployees}
                  pendingAttendance={data.pendingAttendance}
                  attendance={data.attendance}
                  pendingNotes={data.pendingNotes}
                  notes={data.notes}
                  setEditingEmployee={data.setEditingEmployee}
                  setShowEditEmployeeModal={data.setShowEditEmployeeModal}
                  handleDeleteEmployee={data.handleDeleteEmployee}
                  setStatus={data.setStatus}
                  lockedDays={data.lockedDays}
                  setNote={data.setNote}
                  setLockedDays={data.setLockedDays}
                  handleSave={data.handleSave}
                  isSaving={data.isSaving}
                  currentShift={auth.currentShift}
                />
              </Suspense>
            )}

            {activeTab === 'ferias' && !auth.isSupervision && (
              <Suspense fallback={<SectionLoader />}>
                <VacationManagement
                  employees={data.employees}
                  vacations={data.vacations}
                  vacationStats={analytics.vacationStats ?? []}
                  handleAddVacation={data.handleAddVacation}
                  handleDeleteVacation={data.handleDeleteVacation}
                  handleUpdateVacation={data.handleUpdateVacation}
                  updateEmployeeData={data.updateEmployeeData}
                />
              </Suspense>
            )}

            {activeTab === 'ferias_dashboard' && (
              <Suspense fallback={<SectionLoader />}>
                <VacationAnalytics
                  vacationStats={analytics.vacationStats}
                  vacationMonthlyBreakdown={analytics.vacationMonthlyBreakdown}
                  vacationLiability={analytics.vacationLiability}
                  vacationOverlapAlerts={analytics.vacationOverlapAlerts}
                  vacationHeatmap={analytics.vacationHeatmap}
                  currentShift={auth.currentShift || 'A'}
                  allVacations={data.vacations}
                  allEmployees={data.employees}
                  currentYear={currentYear}
                />
              </Suspense>
            )}
          </ErrorBoundary>
        )}
      </main>

      {data.showAddEmployeeModal && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <AddEmployeeModal
              showAddEmployeeModal={data.showAddEmployeeModal}
              setShowAddEmployeeModal={data.setShowAddEmployeeModal}
              handleAddEmployee={data.handleAddEmployee}
              newEmployeeName={data.newEmployeeName}
              setNewEmployeeName={data.setNewEmployeeName}
              newEmployeeRole={data.newEmployeeRole}
              setNewEmployeeRole={data.setNewEmployeeRole}
              newEmployeeAdmissionDate={data.newEmployeeAdmissionDate}
              setNewEmployeeAdmissionDate={data.setNewEmployeeAdmissionDate}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {data.showEditEmployeeModal && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <EditEmployeeModal
              showEditEmployeeModal={data.showEditEmployeeModal}
              setShowEditEmployeeModal={data.setShowEditEmployeeModal}
              editingEmployee={data.editingEmployee}
              setEditingEmployee={data.setEditingEmployee}
              handleUpdateEmployee={data.handleUpdateEmployee}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {data.selectedEmployeeDetail && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <EmployeeDetailModal
              selectedEmployeeDetail={data.selectedEmployeeDetail}
              setSelectedEmployeeDetail={data.setSelectedEmployeeDetail}
              getInitials={getInitials}
              globalAttendance={data.globalAttendance}
              VALID_WORK_DAYS={VALID_WORK_DAYS}
              employeeData={analytics.employeeData}
              daysInMonth={daysInMonth}
              currentMonth={currentMonth}
              currentYear={currentYear}
              isWorkDay={isWorkDay}
              getWeekdayName={getWeekdayName}
              supervisionShiftFilter={supervisionShiftFilter}
              isSupervision={auth.isSupervision}
              currentShift={auth.currentShift}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}
