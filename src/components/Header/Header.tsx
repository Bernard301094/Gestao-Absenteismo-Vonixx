import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronLeft, ChevronRight, LayoutDashboard, ClipboardList, Calendar, RefreshCw, ChevronDown, Check, Settings } from 'lucide-react';
import { MONTH_NAMES, now } from '../../utils/constants';
import SettingsModal from '../Settings/SettingsModal';

interface HeaderProps {
  isSupervision: boolean;
  currentShift: string | null;
  currentMonth: number;
  setCurrentMonth: (month: number) => void;
  currentYear: number;
  setCurrentYear: (year: number) => void;
  supervisionShiftFilter: 'A'|'B'|'C'|'D';
  setSupervisionShiftFilter: (shift: 'A'|'B'|'C'|'D') => void;
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
}

import CustomDropdown from '../CustomDropdown';

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
  userEmail
}: HeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const monthOptions = MONTH_NAMES.map((name, i) => ({ value: i, label: name.substring(0, 3) }))
    .filter(opt => {
      if (currentYear === 2026 && opt.value < 3) return false;
      if (currentYear > now.getFullYear() || (currentYear === now.getFullYear() && opt.value > now.getMonth())) return false;
      return true;
    });

  const yearOptions = [2026, 2027].filter(y => y <= now.getFullYear()).map(y => ({ value: y, label: y.toString() }));

  const dayOptions = [
    { value: 'all', label: activeTab === 'registro' ? 'Sel. Dia' : 'Filtrar Dia' },
    ...VALID_WORK_DAYS.map(d => ({ value: d, label: `Dia ${d}` }))
  ];

  return (
    <header className="bg-[#1e3a8a] border-b border-blue-900 sticky top-0 z-20 shadow-lg pb-safe">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar: Identity & Logout */}
        <div className="h-14 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            {/* Brand Isotype */}
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 shrink-0">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40">
                <span className="text-white font-black text-[10px] sm:text-xs tracking-tighter select-none">VA</span>
              </div>
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border-2 border-[#1e3a8a] shadow-sm ${
                connectionError ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'
              }`} />
            </div>

            {/* Title & Badge */}
            <div className="flex flex-col min-w-0">
              <h1 className="text-[11px] sm:text-base font-black tracking-tight text-white uppercase truncate">
                Vonixx <span className="text-blue-300 italic font-extrabold sm:not-italic sm:font-black">Frequência</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-widest leading-none ${
                    isSupervision
                      ? 'bg-violet-500/30 text-violet-200 border border-violet-400/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  }`}>
                    {isSupervision ? 'Supervisão' : `Turno ${currentShift}`}
                </span>
                <span className="text-[8px] sm:text-[9px] text-blue-200/50 font-bold uppercase truncate">
                  {MONTH_NAMES[currentMonth]}
                </span>
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="flex items-center gap-2">
            {userEmail === 'bernard30101994@gmail.com' && (
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-2"
              >
                <Settings className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline text-xs font-black uppercase tracking-widest">Ajustes</span>
              </button>
            )}

            <button 
              onClick={logout}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-2"
            >
              <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline text-xs font-black uppercase tracking-widest">Sair</span>
            </button>
          </div>
        </div>

        {/* Filter Bar: Month, Year, Day, Shift */}
        <div className="pb-3 flex flex-wrap items-center gap-2">
          {/* Group 1: Calendar Navigation */}
          <div className="flex items-center gap-1.5 bg-white/10 rounded-xl p-1 border border-white/5 flex-1 sm:flex-none">
            <CustomDropdown 
              value={currentMonth} 
              options={monthOptions} 
              onChange={(val) => {
                setCurrentMonth(val);
                setSelectedDay('all');
              }}
              compact
            />
            <div className="w-px h-3 bg-white/20" />
            <CustomDropdown 
              value={currentYear} 
              options={yearOptions} 
              onChange={(val) => {
                setCurrentYear(val);
                setSelectedDay('all');
                if (val === 2026 && currentMonth < 3) setCurrentMonth(3);
              }}
              compact
            />
          </div>

          {/* Group 2: Day Selector */}
          <div className="flex items-center gap-0.5 bg-white/10 rounded-xl p-1 border border-white/5 flex-1 sm:flex-none">
             {activeTab === 'registro' && (
              <button 
                onClick={handlePrevDay}
                disabled={selectedDay !== 'all' && VALID_WORK_DAYS.indexOf(selectedDay as number) <= 0}
                className="p-1 px-1.5 text-white/50 hover:text-white disabled:opacity-20 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            
            <div className="flex-1 min-w-[80px]">
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
                disabled={selectedDay !== 'all' && VALID_WORK_DAYS.indexOf(selectedDay as number) >= VALID_WORK_DAYS.length - 1}
                className="p-1 px-1.5 text-white/50 hover:text-white disabled:opacity-20 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Group 3: Supervision Shift Mix (Only for supervision) */}
          {isSupervision && (
            <div className="w-full sm:w-auto bg-white/5 rounded-xl p-1 border border-white/5 overflow-hidden">
              <div className="flex text-center">
                {['A', 'B', 'C', 'D'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSupervisionShiftFilter(s as any)}
                    className={`flex-1 sm:px-4 py-1.5 text-[10px] sm:text-xs font-black rounded-lg transition-all ${
                      supervisionShiftFilter === s 
                        ? 'bg-blue-500 text-white shadow-lg' 
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {deferredPrompt && !isStandalone && (
        <div className="animate-in slide-in-from-top duration-500">
          <button 
            onClick={handleInstallClick}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg border-y border-white/10"
          >
            <RefreshCw className="w-3 h-3 animate-spin-slow" />
            Clique aqui para instalar o aplicativo
          </button>
        </div>
      )}
       {/* Tabs Navigation - Responsive Flex Layout */}
      <div className="bg-white border-b border-gray-100 shadow-sm overflow-hidden">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto">
          <div className="flex items-center p-1 sm:p-2 sm:gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-5 py-2.5 sm:py-2.5 rounded-xl transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
              } text-[8px] min-[360px]:text-[9px] min-[400px]:text-[10px] sm:text-[13px] font-black uppercase tracking-widest`}
            >
              <LayoutDashboard className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'dashboard' ? 'scale-110' : ''}`} />
              <span className="truncate">Painel</span>
            </button>

            {!isSupervision && (
              <button
                onClick={() => {
                  setActiveTab('registro');
                  if (selectedDay === 'all' && VALID_WORK_DAYS.length > 0) {
                    setSelectedDay(VALID_WORK_DAYS[0]);
                  }
                }}
                className={`flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-5 py-2.5 sm:py-2.5 rounded-xl transition-all ${
                  activeTab === 'registro'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                } text-[8px] min-[360px]:text-[9px] min-[400px]:text-[10px] sm:text-[13px] font-black uppercase tracking-widest`}
              >
                <ClipboardList className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'registro' ? 'scale-110' : ''}`} />
                <span className="truncate">Lançar</span>
              </button>
            )}

            {!isSupervision && (
              <button
                onClick={() => setActiveTab('ferias')}
                className={`flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-5 py-2.5 sm:py-2.5 rounded-xl transition-all ${
                  activeTab === 'ferias'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                } text-[8px] min-[360px]:text-[9px] min-[400px]:text-[10px] sm:text-[13px] font-black uppercase tracking-widest`}
              >
                <Calendar className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'ferias' ? 'scale-110' : ''}`} />
                <span className="truncate">Férias</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('ferias_dashboard')}
              className={`flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-5 py-2.5 sm:py-2.5 rounded-xl transition-all ${
                activeTab === 'ferias_dashboard'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-100'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
              } text-[8px] min-[360px]:text-[9px] min-[400px]:text-[10px] sm:text-[13px] font-black uppercase tracking-widest`}
            >
              <LayoutDashboard className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'ferias_dashboard' ? 'scale-110' : ''}`} />
              <span className="truncate">Análise</span>
            </button>
          </div>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </header>
  );
}
