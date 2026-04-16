export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'national' | 'state' | 'movable';
}

function getEaster(year: number): Date {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);

  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getHolidaysForYear(year: number): Holiday[] {
  const easter = getEaster(year);
  
  const carnaval = addDays(easter, -47);
  const fridayBeforeEaster = addDays(easter, -2);
  const corpusChristi = addDays(easter, 60);

  const holidays: Holiday[] = [
    // Movable
    { date: formatDate(carnaval), name: 'Carnaval', type: 'movable' },
    { date: formatDate(addDays(carnaval, 1)), name: 'Quarta-feira de Cinzas', type: 'movable' },
    { date: formatDate(fridayBeforeEaster), name: 'Sexta-feira Santa (Paixão de Cristo)', type: 'movable' },
    { date: formatDate(easter), name: 'Páscoa', type: 'movable' },
    { date: formatDate(corpusChristi), name: 'Corpus Christi', type: 'movable' },
    
    // Fixed National
    { date: `${year}-01-01`, name: 'Confraternização Universal', type: 'national' },
    { date: `${year}-04-21`, name: 'Tiradentes', type: 'national' },
    { date: `${year}-05-01`, name: 'Dia do Trabalho', type: 'national' },
    { date: `${year}-09-07`, name: 'Independência do Brasil', type: 'national' },
    { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida', type: 'national' },
    { date: `${year}-11-02`, name: 'Finados', type: 'national' },
    { date: `${year}-11-15`, name: 'Proclamação da República', type: 'national' },
    { date: `${year}-12-25`, name: 'Natal', type: 'national' },
    
    // Fixed State (Ceará)
    { date: `${year}-03-25`, name: 'Data Magna do Ceará', type: 'state' },
  ];

  return holidays;
}

export function getHolidayInfo(day: number, month: number, year: number): Holiday | null {
  const holidays = getHolidaysForYear(year);
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return holidays.find(h => h.date === dateStr) || null;
}
