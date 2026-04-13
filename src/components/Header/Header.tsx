import React from 'react';
import { LogOut, ChevronLeft, ChevronRight, LayoutDashboard, ClipboardList } from 'lucide-react';
import { MONTH_NAMES, now } from '../../utils/constants';
import styles from './Header.module.css';

interface HeaderProps {
  isSupervision: boolean;
  currentShift: string | null;
  currentMonth: number;
  setCurrentMonth: (month: number) => void;
  currentYear: number;
  setCurrentYear: (year: number) => void;
  supervisionShiftFilter: 'A'|'B'|'C'|'D';
  setSupervisionShiftFilter: (shift: 'A'|'B'|'C'|'D') => void;
  activeTab: 'dashboard' | 'registro';
  setActiveTab: (tab: 'dashboard' | 'registro') => void;
  selectedDay: number | 'all';
  setSelectedDay: (day: number | 'all') => void;
  VALID_WORK_DAYS: number[];
  handlePrevDay: () => void;
  handleNextDay: () => void;
  logout: () => void;
  deferredPrompt: any;
  isStandalone: boolean;
  handleInstallClick: () => void;
}

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
  handleInstallClick
}: HeaderProps) {
  return (
    <header className="bg-[#1e3a8a] border-b border-blue-900 sticky top-0 z-20 shadow-lg">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 sm:h-16 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-3">
              {/* Isotipo */}
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 shrink-0">
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40">
                  <span className="text-white font-black text-xs sm:text-sm tracking-tighter select-none">VA</span>
                </div>
                {/* Pulse dot */}
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#1e3a8a] shadow-sm" />
              </div>

              {/* Text */}
              <div className="flex flex-col">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase leading-none">
                  Gestão de{' '}
                  <span className="text-blue-300">Absenteísmo</span>
                </h1>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                    isSupervision
                      ? 'bg-violet-500/30 text-violet-200 border border-violet-400/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  }`}>
                    {isSupervision ? '★ Supervisão' : `Turno ${currentShift}`}
                  </span>
                  <span className="text-[9px] text-blue-300/60 font-medium">•</span>
                  <span className="text-[9px] text-blue-200/70 font-bold uppercase tracking-wider">{MONTH_NAMES[currentMonth]}</span>
                </div>
              </div>
            </div>

            {/* Mobile Logout */}
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
                className="bg-transparent border-none text-[10px] sm:text-xs font-black text-white focus:ring-0 cursor-pointer py-1 pr-7 pl-2 [&>option]:text-gray-900 uppercase tracking-wider scale-100"
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
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 py-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all duration-200 ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 transition-transform duration-200 ${
                activeTab === 'dashboard' ? 'scale-110' : ''
              }`} />
              Dashboard
            </button>

            {!isSupervision && (
              <button
                onClick={() => {
                  setActiveTab('registro');
                  if (selectedDay === 'all' && VALID_WORK_DAYS.length > 0) {
                    setSelectedDay(VALID_WORK_DAYS[0]);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all duration-200 ${
                  activeTab === 'registro'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ClipboardList className={`w-4 h-4 transition-transform duration-200 ${
                  activeTab === 'registro' ? 'scale-110' : ''
                }`} />
                Registro
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
