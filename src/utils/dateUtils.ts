/**
 * Calcula o número de dias no mês dado.
 */
export const getDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Determina se um dia é dia de trabalho na escala 12x36.
 * Referência: 13/04/2026 foi um dia de trabalho (segunda-feira).
 */
export const isWorkDay = (day: number, month: number, year: number): boolean => {
  const date = new Date(year, month, day, 12, 0, 0);
  const refDate = new Date(2026, 3, 13, 12, 0, 0);
  const diffDays = Math.round((date.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays % 2 === 0;
};

/**
 * Retorna o nome do dia da semana em português para uma data específica.
 */
export const getWeekdayName = (day: number, month: number, year: number): string => {
  return new Date(year, month, day).toLocaleDateString('pt-BR', { weekday: 'long' });
};

/**
 * Retorna as iniciais de um nome completo (máx. 2 caracteres).
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};
