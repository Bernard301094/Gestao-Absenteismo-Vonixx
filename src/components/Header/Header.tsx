/**
 * Header.tsx — Refatorado
 * 
 * Layout responsivo com CSS Grid + Flexbox:
 * - Mobile  (<640px): tudo empilhado, dropdowns full-width
 * - Tablet  (640-1024px): duas linhas, filtros em linha
 * - Desktop (>1024px): linha única compacta
 */

import React, { useState } from 'react';
import {
  LogOut, ChevronLeft, ChevronRight,
  LayoutDashboard, ClipboardList, Calendar,
  RefreshCw, Settings, Download, FileText, Fingerprint, QrCode, X,
} from 'lucide-react';
import { MONTH_NAMES, now } from '../../utils/constants';
import SettingsModal from '../Settings/SettingsModal';
import BiometricToggleModal from '../BiometricToggle/BiometricToggleModal';
import CustomDropdown from '../CustomDropdown';
import QRCodePanel from '../QRCodePanel/QRCodePanel';

const BASE_KIOSK_URL = 'https://gestao-absenteismo-vonixx.web.app/presenca';

interface HeaderProps {
  isSupervision: boolean;
  currentShift: string | null;
  currentMonth: number;
  setCurrentMonth: (month: number) => void;
  currentYear: number;
  setCurrentYear: (year: number) => void;
  supervisionShiftFilter: 'A' | 'B' | 'C' | 'D';
  setSupervisionShiftFilter: (shift: 'A' | 'B' | 'C' | 'D') => void;
  activeTab: 'dashboard' | 'registro' | 'ferias' | 'ferias_dashboard';
  setActiveTab: (tab: 'dashboard' | 'registro' | 'ferias' | 'ferias_dashboard') => void;
  selectedDay: number | 'all';
  setSelectedDay: (day: number | 'all') => void;
  VALID_WORK_DAYS: number[];
  handlePrevDay: () => void;
  handleNextDay: () => void;
  logout: () => void;
  deferredPrompt: any;
  isStandalone: boolean;
  handleInstallClick: () => void;
  connectionError: string | null;
  handleRetry: () => void;
  userEmail: string | null;
  /** Callbacks opcionais para exportação */
  onExportImage?: () => void;
  onExportPDF?: () => void;
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ isActive, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 sm:flex-none
        inline-flex flex-col sm:flex-row items-center justify-center
        gap-1 sm:gap-2
        px-2 sm:px-5 py-2 sm:py-2.5
        rounded-xl
        text-[8px] min-[360px]:text-[9px] sm:text-xs
        font-black uppercase tracking-widest
        transition-all duration-200
        ${isActive
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:scale-95'
        }
      `}
    >
      <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
        {icon}
      </span>
      <span className="truncate leading-none">{label}</span>
    </button>
  );
}

// ─── Shift Pill ───────────────────────────────────────────────────────────────

function ShiftSelector({
  value,
  onChange,
}: {
  value: 'A' | 'B' | 'C' | 'D';
  onChange: (s: 'A' | 'B' | 'C' | 'D') => void;
}) {
  return (
    <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10 gap-0.5">
      {(['A', 'B', 'C', 'D'] as const).map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`
            w-8 h-7 sm:w-9 sm:h-8
            rounded-lg text-xs font-black
            transition-all duration-150 active:scale-90
            ${value === s
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-white/50 hover:text-white hover:bg-white/10'
            }
          `}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// ─── Connection Dot ───────────────────────────────────────────────────────────

function ConnectionDot({ hasError }: { hasError: boolean }) {
  return (
    <span
      className={`
        w-2 h-2 rounded-full border-2 border-[#1e3a8a]
        absolute -top-0.5 -right-0.5
        ${hasError ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}
      `}
    />
  );
}

// ─── QR Drawer ────────────────────────────────────────────────────────────────

function QRDrawer({
  open,
  onClose,
  kioskUrl,
}: {
  open: boolean;
  onClose: () => void;
  kioskUrl: string;
}) {
  if (!open) return null;
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed top-16 right-3 sm:right-6 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center shadow-lg hover:bg-gray-700 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <QRCodePanel baseUrl={kioskUrl} />
        </div>
      </div>
    </>
  );
}

// ─── Header Principal ─────────────────────────────────────────────────────────

export default function Header({
  isSupervision,
  currentShift,
  currentMonth,
  setCurrentMonth,
  currentYear,
  setCurrentYear,
  supervisionShiftFilter,
  setSupervisionShiftFilter,
  activeTab,
  setActiveTab,
  selectedDay,
  setSelectedDay,
  VALID_WORK_DAYS,
  handlePrevDay,
  handleNextDay,
  logout,
  deferredPrompt,
  isStandalone,
  handleInstallClick,
  connectionError,
  handleRetry,
  userEmail,
  onExportImage,
  onExportPDF,
}: HeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBiometricOpen, setIsBiometricOpen] = useState(false);
  const [showQRDrawer, setShowQRDrawer] = useState(false);

  const kioskUrl = `${BASE_KIOSK_URL}?shift=${currentShift ?? 'A'}`;

  // ── Options ────────────────────────────────────────────────────────────────

  const monthOptions = MONTH_NAMES
    .map((name, i) => ({ value: i, label: name.substring(0, 3) }))
    .filter(opt => {
      if (currentYear === 2026 && opt.value < 3) return false;
      if (
        currentYear > now.getFullYear() ||
        (currentYear === now.getFullYear() && opt.value > now.getMonth())
      ) return false;
      return true;
    });

  const yearOptions = [2026, 2027]
    .filter(y => y <= now.getFullYear())
    .map(y => ({ value: y, label: y.toString() }));

  const dayOptions = [
    { value: 'all', label: activeTab === 'registro' ? 'Sel. Dia' : 'Todos os Dias' },
    ...VALID_WORK_DAYS.map(d => ({ value: d, label: `Dia ${d}` })),
  ];

  const isAdmin = userEmail === 'bernard30101994@gmail.com';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <header className="bg-[#1e3a8a] sticky top-0 z-20 shadow-xl border-b border-blue-950 pb-safe">

      {/* ── QR Drawer flutuante ────────────────────────────────────────── */}
      {!isSupervision && (
        <QRDrawer
          open={showQRDrawer}
          onClose={() => setShowQRDrawer(false)}
          kioskUrl={kioskUrl}
        />
      )}

      {/* ── Barra Superior: Identidade + Ações ────────────────────────────── */}
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="h-13 sm:h-15 flex items-center justify-between gap-3 py-2">

          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Logotipo */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-950/50">
                <span className="text-white font-black text-[11px] tracking-tighter select-none">VA</span>
              </div>
              <ConnectionDot hasError={!!connectionError} />
            </div>

            {/* Nome + Badge */}
            <div className="flex flex-col justify-center min-w-0">
              <h1 className="text-[11px] sm:text-sm font-black tracking-tight text-white uppercase leading-none">
                Vonixx{' '}
                <span className="text-blue-300 italic">Frequência</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`
                  inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest leading-none
                  ${isSupervision
                    ? 'bg-violet-500/30 text-violet-200 border border-violet-400/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  }
                `}>
                  {isSupervision ? 'Supervisão' : `Turno ${currentShift}`}
                </span>
                <span className="text-[8px] text-blue-200/50 font-bold uppercase truncate hidden sm:block">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
              </div>
            </div>

            {/* Filtros em Desktop */}
            <div className="hidden md:flex ml-4 items-center gap-2">
                {/* Grupo 1: Mês + Ano */}
                <div className="flex items-center gap-1 bg-white/10 rounded-xl px-1 py-1 border border-white/5">
                  <CustomDropdown
                    value={currentMonth}
                    options={monthOptions}
                    onChange={val => { setCurrentMonth(val); setSelectedDay('all'); }}
                    compact
                  />
                  <div className="w-px h-3 bg-white/20 mx-0.5" />
                  <CustomDropdown
                    value={currentYear}
                    options={yearOptions}
                    onChange={val => {
                      setCurrentYear(val);
                      setSelectedDay('all');
                      if (val === 2026 && currentMonth < 3) setCurrentMonth(3);
                    }}
                    compact
                  />
                </div>
                {/* Grupo 2: Dia */}
                <div className="flex items-center min-w-[100px] bg-white/10 rounded-xl px-1 py-1 border border-white/5">
                  <CustomDropdown
                    value={selectedDay}
                    options={dayOptions}
                    onChange={setSelectedDay}
                    compact
                  />
                </div>
                {/* Grupo 3: Turno */}
                {isSupervision && (
                  <ShiftSelector
                    value={supervisionShiftFilter}
                    onChange={setSupervisionShiftFilter}
                  />
                )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-1 shrink-0">

            {/* QR Presença (não-supervisão) */}
            {!isSupervision && (
              <button
                onClick={() => setShowQRDrawer(v => !v)}
                title="QR Presença"
                className={`
                  p-2 rounded-xl transition-all active:scale-90 flex items-center gap-1.5
                  ${showQRDrawer
                    ? 'bg-teal-500 text-white shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                  }
                `}
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">
                  QR
                </span>
              </button>
            )}

            {/* Export: imagem */}
            {onExportImage && (
              <button
                onClick={onExportImage}
                title="Exportar imagem"
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-90"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            {/* Export: PDF */}
            {onExportPDF && (
              <button
                onClick={onExportPDF}
                title="Exportar PDF"
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-90"
              >
                <FileText className="w-4 h-4" />
              </button>
            )}

            {/* Biometric lock toggle (mobile & tablet only) */}
            <button
              onClick={() => setIsBiometricOpen(true)}
              title="Bloqueio por huella dactilar"
              className="lg:hidden p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-90 flex items-center gap-1.5"
            >
              <Fingerprint className="w-4 h-4" />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">
                Huella
              </span>
            </button>

            {/* Settings (admin only) */}
            {isAdmin && (
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-90 flex items-center gap-1.5"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">
                  Ajustes
                </span>
              </button>
            )}

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-90 flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">
                Sair
              </span>
            </button>
          </div>
        </div>

      {/* ── Barra de Filtros (Mobile only) ─────────────────────────────── */}
      <div className="md:hidden pb-3 px-3 flex flex-wrap items-center gap-2">
        {/* Grupo 1: Mês + Ano */}
        <div className="flex items-center gap-1 bg-white/10 rounded-xl px-1 py-1 border border-white/5">
          <CustomDropdown
            value={currentMonth}
            options={monthOptions}
            onChange={val => { setCurrentMonth(val); setSelectedDay('all'); }}
            compact
          />
          <div className="w-px h-3 bg-white/20 mx-0.5" />
          <CustomDropdown
            value={currentYear}
            options={yearOptions}
            onChange={val => {
              setCurrentYear(val);
              setSelectedDay('all');
              if (val === 2026 && currentMonth < 3) setCurrentMonth(3);
            }}
            compact
          />
        </div>

        {/* Grupo 2: Dia */}
        <div className="flex items-center bg-white/10 rounded-xl px-1 py-1 border border-white/5 flex-1 sm:flex-none min-w-[110px]">
          {activeTab === 'registro' && (
            <button
              onClick={handlePrevDay}
              disabled={selectedDay !== 'all' && VALID_WORK_DAYS.indexOf(selectedDay as number) <= 0}
              className="p-1 text-white/50 hover:text-white disabled:opacity-20 transition-colors shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex-1">
            <CustomDropdown
              value={selectedDay}
              options={dayOptions}
              onChange={setSelectedDay}
              compact
            />
          </div>

          {activeTab === 'registro' && (
            <button
              onClick={handleNextDay}
              disabled={
                selectedDay !== 'all' &&
                VALID_WORK_DAYS.indexOf(selectedDay as number) >= VALID_WORK_DAYS.length - 1
              }
              className="p-1 text-white/50 hover:text-white disabled:opacity-20 transition-colors shrink-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Grupo 3: Selector de turno (supervisão) */}
        {isSupervision && (
          <ShiftSelector
            value={supervisionShiftFilter}
            onChange={setSupervisionShiftFilter}
          />
        )}
      </div>
      </div>

      {/* ── Banner de Instalação PWA ──────────────────────────────────────── */}
      {deferredPrompt && !isStandalone && (
        <button
          onClick={handleInstallClick}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] border-y border-white/10 transition-colors"
        >
          <RefreshCw className="w-3 h-3 animate-spin-slow" />
          Clique aqui para instalar o aplicativo
        </button>
      )}

      {/* ── Tabs de Navegação ─────────────────────────────────────────────── */}
      <div className="bg-white border-t border-gray-100 shadow-sm">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-1 sm:px-2">
          <div className="flex items-center justify-center p-1 gap-0.5 sm:gap-1.5">

            <TabButton
              isActive={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              icon={<LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              label="Painel"
            />

            {!isSupervision && (
              <TabButton
                isActive={activeTab === 'registro'}
                onClick={() => {
                  setActiveTab('registro');
                  if (selectedDay === 'all' && VALID_WORK_DAYS.length > 0) {
                    setSelectedDay(VALID_WORK_DAYS[0]);
                  }
                }}
                icon={<ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                label="Lançar"
              />
            )}

            {!isSupervision && (
              <TabButton
                isActive={activeTab === 'ferias'}
                onClick={() => setActiveTab('ferias')}
                icon={<Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                label="Férias"
              />
            )}

            <TabButton
              isActive={activeTab === 'ferias_dashboard'}
              onClick={() => setActiveTab('ferias_dashboard')}
              icon={<LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              label="Análise Férias"
            />

          </div>
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <BiometricToggleModal isOpen={isBiometricOpen} onClose={() => setIsBiometricOpen(false)} />
    </header>
  );
}
