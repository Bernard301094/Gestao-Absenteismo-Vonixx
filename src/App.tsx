import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAuth } from './hooks/useAuth';
import { useFirestoreData } from './hooks/useFirestoreData';
import { testConnection } from './firebase';
import { useDashboardAnalytics } from './hooks/useDashboardAnalytics';
import { getDaysInMonth, isWorkDay, getWeekdayName, getInitials } from './utils/dateUtils';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

// ─── Static Components ────────────────────────────────────────────────────────
import Login from './components/Login/Login';
import Header from './components/Header/Header';

// ─── Code-Split Views (loaded on demand) ─────────────────────────────────────
const AbsenteeismDashboard = lazy(() => import('./components/AbsenteeismDashboard/AbsenteeismDashboard'));
const AttendanceRegistry   = lazy(() => import('./components/AttendanceRegistry/AttendanceRegistry'));
const VacationManagement   = lazy(() => import('./components/VacationManagement/VacationManagement'));
const VacationAnalytics    = lazy(() => import('./components/VacationAnalytics/VacationAnalytics'));

// ─── Code-Split Modals ────────────────────────────────────────────────────────
const AddEmployeeModal    = lazy(() => import('./components/AddEmployeeModal/AddEmployeeModal'));
const EditEmployeeModal   = lazy(() => import('./components/EditEmployeeModal/EditEmployeeModal'));
const EmployeeDetailModal = lazy(() => import('./components/EmployeeDetailModal/EmployeeDetailModal'));

// ─── Shared Loading Spinner ───────────────────────────────────────────────────
function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700" />
    </div>
  );
}

// ─── Date Seed ────────────────────────────────────────────────────────────────
const now = new Date();
const INITIAL_MONTH = now.getMonth();
const INITIAL_YEAR  = now.getFullYear();

export default function App() {
  // ─── UI State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'dashboard' | 'registro' | 'ferias' | 'ferias_dashboard'>('dashboard');
  const [currentMonth, setCurrentMonth] = useState(INITIAL_MONTH);
  const [currentYear, setCurrentYear]   = useState(INITIAL_YEAR);
  const [selectedDay, setSelectedDay]   = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm]               = useState('');
  const [registroSearchTerm, setRegistroSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'regular' | 'atencao' | 'critico'>('all');
  const [sortOrder, setSortOrder]       = useState<'desc_faltas' | 'asc_name' | 'desc_name'>('desc_faltas');
  const [supervisionShiftFilter, setSupervisionShiftFilter] = useState<'A' | 'B' | 'C' | 'D'>('A');

  // ─── Date Calculations ─────────────────────────────────────────────────────
  const daysInMonth = useMemo(
    () => getDaysInMonth(currentMonth, currentYear),
    [currentMonth, currentYear],
  );

  const currentDayOfMonth = useMemo(() => {
    const today = new Date();
    if (today.getMonth() === currentMonth && today.getFullYear() === currentYear) return today.getDate();
    return daysInMonth;
  }, [currentMonth, currentYear, daysInMonth]);

  const isValidDay = useCallback(
    (day: number) => {
      if (currentYear > now.getFullYear()) return false;
      if (currentYear === now.getFullYear() && currentMonth > now.getMonth()) return false;
      if (currentYear === now.getFullYear() && currentMonth === now.getMonth()) {
        return day <= now.getDate() && day !== 1;
      }
      return day !== 1;
    },
    [currentMonth, currentYear],
  );

  const VALID_WORK_DAYS = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(
        d => isWorkDay(d, currentMonth, currentYear) && isValidDay(d),
      ),
    [daysInMonth, currentMonth, currentYear, isValidDay],
  );

  // ─── Custom Hooks ───────────────────────────────────────────────────────────
  const auth = useAuth();

  useEffect(() => { testConnection(); }, []);

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
    attendance: data.attendance,
    employees: data.employees,
    globalEmployees: data.globalEmployees,
    globalAttendance: data.globalAttendance,
    globalCompletions: data.globalCompletions,
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
  });

  // ─── Access Control ────────────────────────────────────────────────────────
  useEffect(() => {
    if (auth.isSupervision && (activeTab === 'registro' || activeTab === 'ferias')) {
      setActiveTab('dashboard');
    }
  }, [auth.isSupervision, activeTab]);

  // ─── Day Navigation ─────────────────────────────────────────────────────────
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
    const idx = selectedDay === 'all' ? -1 : VALID_WORK_DAYS.indexOf(selectedDay as number);
    if (idx < VALID_WORK_DAYS.length - 1) setSelectedDay(VALID_WORK_DAYS[idx + 1]);
  };

  // ─── Render: Loading ───────────────────────────────────────────────────────
  if (auth.authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700" />
      </div>
    );
  }

  // ─── Render: Login ─────────────────────────────────────────────────────────
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

  // ─── Render: App ───────────────────────────────────────────────────────────
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
            <Suspense fallback={<SectionLoader />}>

              {activeTab === 'dashboard' && (
                <AbsenteeismDashboard
                  handleExportExcel={data.handleExportExcel}
                  isSupervision={auth.isSupervision}
                  alerts={analytics.alerts}
                  selectedDay={selectedDay}
                  currentMonth={currentMonth}
                  currentYear={currentYear}
                  totalFaltasMes={analytics.totalFaltasMes}
                  employees={data.employees}
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
                />
              )}

              {activeTab === 'registro' && !auth.isSupervision && (
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
                />
              )}

              {/* ─── FÉRIAS: agora recebe vacationStats de analytics ─── */}
              {activeTab === 'ferias' && !auth.isSupervision && (
                <VacationManagement
                  employees={data.employees}
                  vacations={data.vacations}
                  vacationStats={analytics.vacationStats ?? []}
                  handleAddVacation={data.handleAddVacation}
                  handleDeleteVacation={data.handleDeleteVacation}
                  handleUpdateVacation={data.handleUpdateVacation}
                  updateEmployeeData={data.updateEmployeeData}
                />
              )}

              {activeTab === 'ferias_dashboard' && (
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
              )}

            </Suspense>
          </ErrorBoundary>
        )}
      </main>

      {/* ─── Modals ────────────────────────────────────────────────────────── */}
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
