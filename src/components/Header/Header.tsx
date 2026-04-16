import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronLeft, ChevronRight, LayoutDashboard, ClipboardList, Calendar, RefreshCw, ChevronDown, Check } from 'lucide-react';
import { MONTH_NAMES, now } from '../../utils/constants';

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
  handleRetry
}: HeaderProps) {
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
    <header className="bg-[#1e3a8a] border-b border-blue-900 sticky top-0 z-20 shadow-lg">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-2 sm:py-3 min-h-[64px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          {/* Logo & Info Section */}
          <div className="flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Isotipo */}
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 shrink-0">
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40">
                  <span className="text-white font-black text-[10px] sm:text-xs tracking-tighter select-none">VA</span>
                </div>
                <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border-2 border-[#1e3a8a] shadow-sm ${
                  connectionError ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'
                }`} title={connectionError ? `Erro de conexão: ${connectionError}` : 'Conectado'} />
              </div>

              {/* Text - Adaptive visibility */}
              <div className="flex flex-col">
                <h1 className="text-[11px] min-[400px]:text-xs sm:text-base font-black tracking-tight text-white uppercase leading-none min-[400px]:whitespace-normal whitespace-normal">
                  Vonixx Gestão <span className="text-blue-300 font-extrabold italic">Frequência</span>
                </h1>
                <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1 w-full sm:w-auto">
                  <span className={`flex-1 sm:flex-none inline-flex items-center justify-center px-1.5 py-1 sm:py-0.5 rounded-md text-[9px] sm:text-[9px] font-black uppercase tracking-widest ${
                    isSupervision
                      ? 'bg-violet-500/30 text-violet-200 border border-violet-400/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  }`}>
                    {isSupervision ? '★ Supervisor' : `Turno ${currentShift}`}
                  </span>
                  <span className="text-[9px] text-blue-200/70 font-bold uppercase tracking-wider hidden xs:inline shrink-0">{MONTH_NAMES[currentMonth]}</span>
                </div>
              </div>
            </div>

            {/* Mobile-only Logout (Compact) */}
            <button
              onClick={logout}
              className="sm:hidden p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          
          {/* Controls Section - Fully Responsive Grid/Flex */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 justify-start sm:justify-end w-full sm:w-auto">
            <div className="grid grid-cols-2 gap-1.5 w-full sm:flex sm:w-auto sm:items-center sm:gap-3">
              {/* Seletor de Mês/Ano */}
              <div className="flex items-center justify-center gap-0.5 sm:gap-1 bg-white/20 rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-white/10 shadow-inner w-full sm:w-auto sm:scale-100">
                <CustomDropdown 
                  value={currentMonth} 
                  options={monthOptions} 
                  onChange={(val) => {
                    setCurrentMonth(val);
                    setSelectedDay('all');
                  }}
                  compact
                />
                <div className="w-px h-3 bg-white/20"></div>
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

              {/* Seletor Global de Dia */}
              <div className="flex items-center justify-center gap-0.5 sm:gap-1 bg-white/10 rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-white/10 shadow-inner w-full sm:w-auto sm:scale-100">
                {activeTab === 'registro' && (
                  <button 
                    onClick={handlePrevDay}
                    disabled={selectedDay !== 'all' && VALID_WORK_DAYS.indexOf(selectedDay as number) <= 0}
                    className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                )}
                
                <CustomDropdown 
                  value={selectedDay} 
                  options={dayOptions} 
                  onChange={setSelectedDay}
                  compact
                />

                {activeTab === 'registro' && (
                  <button 
                    onClick={handleNextDay}
                    disabled={selectedDay !== 'all' && VALID_WORK_DAYS.indexOf(selectedDay as number) >= VALID_WORK_DAYS.length - 1}
                    className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                )}
              </div>
            </div>

            {isSupervision && (
              <div className="w-full sm:w-auto flex items-center gap-0.5 sm:gap-1 bg-white/10 rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-white/10 shadow-inner shrink-0 sm:scale-100">
                <div className="grid grid-cols-4 w-full sm:flex sm:items-center sm:gap-1">
                  {['A', 'B', 'C', 'D'].map(s => (
                    <button
                      key={s}
                      onClick={() => setSupervisionShiftFilter(s as any)}
                      className={`px-1.5 sm:px-2.5 py-1.5 sm:py-1 text-[10px] sm:text-xs font-black rounded-md sm:rounded-lg transition-all ${
                        supervisionShiftFilter === s 
                          ? 'bg-white text-blue-900 shadow-sm' 
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Desktop Logout & Reset */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {connectionError && (
                <button 
                  onClick={handleRetry}
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 text-red-200 rounded-lg text-[8px] sm:text-[10px] font-bold border border-red-500/30 hover:bg-red-500/30 transition-all"
                >
                  <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin-slow" />
                  Reset
                </button>
              )}
              <button 
                onClick={logout}
                className="hidden sm:flex items-center gap-1.5 sm:gap-2 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all font-bold text-xs uppercase tracking-widest shrink-0"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {deferredPrompt && !isStandalone && (
        <div className="bg-blue-600 text-white px-4 py-1 flex items-center justify-between text-[10px] sm:text-xs font-bold uppercase tracking-wide">
          <span>Instale o App AI</span>
          <button onClick={handleInstallClick} className="underline uppercase">Instalar</button>
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
    </header>
  );
}
